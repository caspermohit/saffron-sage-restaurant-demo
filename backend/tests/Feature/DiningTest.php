<?php

namespace Tests\Feature;

use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DiningTest extends TestCase
{
    use RefreshDatabase;

    private function menu(): array
    {
        config(['restaurant.staff_password' => 'TestPassword!123']);
        $this->seed();
        $table = DiningTable::first();
        $item = MenuItem::first();
        $c = $this->postJson('/api/menu/'.$table->qr_token.'/open')->assertOk()->json();

        return [$table, $item, $c];
    }

    private function place(array $c, MenuItem $item, array $extra = []): TestResponse
    {
        return $this->withHeader('X-Guest-Token', $c['token'])->postJson('/api/sessions/'.$c['session_id'].'/orders', array_merge(['client_reference' => (string) Str::uuid(), 'items' => [['menu_item_id' => $item->id, 'quantity' => 2, 'size' => 'regular']]], $extra));
    }

    public function test_public_demo_metadata_is_only_available_in_demo_mode(): void
    {
        $this->getJson('/api/demo')->assertNotFound();
        config(['restaurant.demo_mode' => true, 'restaurant.staff_password' => 'TestPassword!123']);
        $this->seed();
        $table = DiningTable::where('name', 'Table 02')->firstOrFail();
        $this->getJson('/api/demo')->assertOk()
            ->assertJsonPath('enabled', true)
            ->assertJsonPath('guest_path', '/menu/'.$table->qr_token);
    }

    public function test_demo_fixtures_use_menu_identity_and_survive_restarts(): void
    {
        config(['restaurant.demo_mode' => true, 'restaurant.staff_password' => 'TestPassword!123']);
        // Imported/previously used databases do not necessarily start menu IDs at one.
        $placeholder = MenuItem::create(['id' => 1000, 'name' => 'Placeholder', 'category' => 'Drinks', 'description' => 'Test', 'price' => 100, 'allergens' => [], 'spice' => 0, 'image' => '', 'available' => true]);
        $this->seed();
        $placeholder->delete();
        $this->artisan('restaurant:demo')->assertSuccessful();
        $this->assertDatabaseCount('orders', 6);
        $this->assertDatabaseCount('order_items', 12);
        $this->artisan('restaurant:demo')->assertSuccessful();
        $this->assertDatabaseCount('orders', 6);
    }

    public function test_reads_do_not_consume_the_order_action_limit(): void
    {
        [$t,$i,$c] = $this->menu();
        for ($n = 0; $n < 12; $n++) {
            $this->withHeader('X-Guest-Token', $c['token'])->getJson('/api/sessions/'.$c['session_id'])->assertOk();
        }
        $this->place($c, $i)->assertCreated();
    }

    public function test_staff_routes_require_authentication(): void
    {
        $this->getJson('/api/staff/state')->assertUnauthorized();
    }

    public function test_login_and_logout(): void
    {
        config(['restaurant.staff_password' => 'TestPassword!123']);
        $this->seed();
        $this->postJson('/api/login', ['email' => 'manager@saffron.local', 'password' => 'wrong'])->assertUnprocessable();
        $token = $this->postJson('/api/login', ['email' => 'manager@saffron.local', 'password' => 'TestPassword!123'])->assertOk()->json('token');
        $this->withToken($token)->getJson('/api/staff/state')->assertOk()->assertJsonCount(12, 'tables');
        $this->withToken($token)->postJson('/api/staff/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_guest_cannot_access_another_table_session(): void
    {
        [$t,$i,$c] = $this->menu();
        $other = DiningTable::where('id', '!=', $t->id)->first();
        $o = $this->postJson('/api/menu/'.$other->qr_token.'/open')->json();
        $this->withHeader('X-Guest-Token', $c['token'])->getJson('/api/sessions/'.$o['session_id'])->assertForbidden();
    }

    public function test_order_prices_are_computed_on_server_and_duplicate_retries_are_safe(): void
    {
        [$t,$i,$c] = $this->menu();
        $ref = (string) Str::uuid();
        $this->place($c, $i, ['client_reference' => $ref, 'total' => 1])->assertCreated()->assertJsonPath('data.subtotal', 2900)->assertJsonPath('data.tax', 377)->assertJsonPath('data.total', 3277);
        $this->place($c, $i, ['client_reference' => $ref])->assertCreated();
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('order_items', 1);
    }

    public function test_large_size_and_unavailable_items(): void
    {
        [$t,$i,$c] = $this->menu();
        $this->place($c, $i, ['items' => [['menu_item_id' => $i->id, 'quantity' => 1, 'size' => 'large']]])->assertCreated()->assertJsonPath('data.subtotal', 2175);
        $i->update(['available' => false]);
        $this->place($c, $i)->assertUnprocessable();
    }

    public function test_invalid_quantities_and_sizes_are_rejected(): void
    {
        [$t,$i,$c] = $this->menu();
        $this->place($c, $i, ['items' => [['menu_item_id' => $i->id, 'quantity' => -1, 'size' => 'regular']]])->assertUnprocessable();
        $this->place($c, $i, ['items' => [['menu_item_id' => $i->id, 'quantity' => 1, 'size' => 'free']]])->assertUnprocessable();
    }

    public function test_waiter_calls_are_deduplicated_and_resolved_by_staff(): void
    {
        [$t,$i,$c] = $this->menu();
        $path = '/api/sessions/'.$c['session_id'].'/calls';
        $id = $this->withHeader('X-Guest-Token', $c['token'])->postJson($path, ['kind' => 'waiter'])->assertCreated()->json('id');
        $this->postJson($path, ['kind' => 'waiter'])->assertCreated();
        $this->assertDatabaseCount('service_calls', 1);
        $this->actingAs(User::first(), 'sanctum')->postJson('/api/staff/calls/'.$id.'/resolve')->assertOk();
        $this->assertDatabaseMissing('service_calls', ['id' => $id, 'resolved_at' => null]);
    }

    public function test_statuses_move_only_forward(): void
    {
        [$t,$i,$c] = $this->menu();
        $id = $this->place($c, $i)->json('data.id');
        $this->actingAs(User::first(), 'sanctum');
        $this->patchJson('/api/staff/orders/'.$id, ['status' => 'served'])->assertUnprocessable();
        foreach (['preparing', 'ready', 'served'] as $status) {
            $this->patchJson('/api/staff/orders/'.$id, ['status' => $status])->assertOk();
        }
        $this->patchJson('/api/staff/orders/'.$id, ['status' => 'preparing'])->assertUnprocessable();
    }

    public function test_split_payments_cannot_overallocate_and_require_staff_confirmation(): void
    {
        [$t,$i,$c] = $this->menu();
        $this->place($c, $i)->assertCreated();
        $path = '/api/sessions/'.$c['session_id'].'/payments';
        $payment = ['client_reference' => (string) Str::uuid(), 'amount' => 1600, 'tip' => 160, 'method' => 'cash'];
        $id = $this->postJson($path, $payment)->assertCreated()->json('id');
        $this->postJson($path, $payment)->assertCreated();
        $this->assertDatabaseCount('payments', 1);
        $this->postJson($path, array_merge($payment, ['client_reference' => (string) Str::uuid(), 'amount' => 2000]))->assertUnprocessable();
        $this->postJson($path, array_merge($payment, ['client_reference' => (string) Str::uuid(), 'method' => 'card']))->assertUnprocessable();
        $this->getJson('/api/sessions/'.$c['session_id'])->assertJsonPath('bill.pending', 1600)->assertJsonPath('bill.paid', 0)->assertJsonPath('bill.remaining', 1677);
        $this->actingAs(User::first(), 'sanctum')->postJson('/api/staff/payments/'.$id.'/confirm')->assertOk();
        $this->postJson('/api/staff/payments/'.$id.'/confirm')->assertConflict();
        $this->getJson('/api/sessions/'.$c['session_id'])->assertJsonPath('bill.paid', 1600);
    }

    public function test_table_cannot_close_unpaid_and_old_guest_credentials_expire_on_close(): void
    {
        [$t,$i,$c] = $this->menu();
        $id = $this->place($c, $i)->json('data.id');
        $this->actingAs(User::first(), 'sanctum');
        $path = '/api/staff/sessions/'.$c['session_id'].'/close';
        $this->postJson($path)->assertUnprocessable();
        Payment::create(['table_session_id' => $c['session_id'], 'client_reference' => (string) Str::uuid(), 'amount' => 3277, 'tip' => 0, 'method' => 'cash', 'status' => 'paid']);
        $this->postJson($path)->assertUnprocessable();
        Order::findOrFail($id)->update(['status' => 'served']);
        $this->postJson($path)->assertOk();
        $this->getJson('/api/sessions/'.$c['session_id'])->assertConflict();
        $new = $this->postJson('/api/menu/'.$t->qr_token.'/open')->assertOk()->json();
        $this->assertNotSame($c['session_id'], $new['session_id']);
    }

    public function test_orders_are_blocked_while_bill_is_being_settled(): void
    {
        [$t,$i,$c] = $this->menu();
        $this->place($c, $i);
        $this->postJson('/api/sessions/'.$c['session_id'].'/payments', ['client_reference' => (string) Str::uuid(), 'amount' => 100, 'tip' => 0, 'method' => 'cash'])->assertCreated();
        $this->place($c, $i)->assertConflict();
    }

    public function test_review_requires_order_and_is_updated_instead_of_duplicated(): void
    {
        [$t,$i,$c] = $this->menu();
        $path = '/api/sessions/'.$c['session_id'].'/review';
        $this->withHeader('X-Guest-Token', $c['token'])->postJson($path, ['rating' => 5])->assertUnprocessable();
        $this->place($c, $i);
        $this->postJson($path, ['rating' => 5, 'comment' => 'Lovely visit'])->assertCreated();
        $this->postJson($path, ['rating' => 4])->assertCreated();
        $this->assertDatabaseCount('reviews', 1);
    }
}
