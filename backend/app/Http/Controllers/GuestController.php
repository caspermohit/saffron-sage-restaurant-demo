<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\DiningTable;
use App\Models\GuestCredential;
use App\Models\MenuItem;
use App\Models\Review;
use App\Services\DiningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GuestController extends Controller
{
    public function __construct(private DiningService $dining) {}

    public function demo(): JsonResponse
    {
        abort_unless(config('restaurant.demo_mode'), 404);
        $table = DiningTable::where('name', 'Table 02')->first();

        return response()->json([
            'enabled' => true,
            'guest_path' => $table ? '/menu/'.$table->qr_token : null,
        ]);
    }

    public function menu(string $token): JsonResponse
    {
        $table = DiningTable::where('qr_token', $token)->firstOrFail();

        return response()->json(['restaurant' => config('restaurant.name'), 'currency' => config('restaurant.currency'), 'tax_percent' => config('restaurant.tax_percent'), 'table' => $table->only('id', 'name', 'zone', 'seats'), 'items' => MenuItem::orderBy('id')->get()]);
    }

    public function open(string $token): JsonResponse
    {
        return DB::transaction(function () use ($token): JsonResponse {
            $table = DiningTable::where('qr_token', $token)->lockForUpdate()->firstOrFail();
            $session = $table->sessions()->where('status', 'open')->first() ?? $table->sessions()->create(['id' => (string) Str::uuid()]);
            $secret = Str::random(64);
            GuestCredential::create(['table_session_id' => $session->id, 'token_hash' => hash('sha256', $secret), 'expires_at' => now()->addHours(8)]);

            return response()->json(['session_id' => $session->id, 'token' => $secret]);
        });
    }

    public function state(Request $request): JsonResponse
    {
        $s = $request->attributes->get('dining_session');

        return response()->json(['orders' => OrderResource::collection($s->orders()->with('items')->latest()->get()), 'bill' => $this->dining->bill($s), 'payments' => $s->payments()->latest()->get(), 'calls' => $s->calls()->whereNull('resolved_at')->get(), 'review' => Review::where('table_session_id', $s->id)->first(), 'wifi' => ['name' => config('restaurant.wifi_name'), 'password' => config('restaurant.wifi_password')], 'bank_instructions' => config('restaurant.bank_instructions')]);
    }

    public function order(Request $request): JsonResponse
    {
        $data = $request->validate(['client_reference' => 'required|uuid', 'notes' => 'nullable|string|max:500', 'items' => 'required|array|min:1|max:30', 'items.*.menu_item_id' => 'required|integer', 'items.*.quantity' => 'required|integer|min:1|max:20', 'items.*.size' => 'required|in:regular,large']);

        return (new OrderResource($this->dining->order($request->attributes->get('dining_session'), $data)))->response()->setStatusCode(201);
    }

    public function call(Request $request): JsonResponse
    {
        $data = $request->validate(['kind' => 'required|in:waiter,water,bill']);
        $s = $request->attributes->get('dining_session');

        return response()->json($s->calls()->firstOrCreate(['kind' => $data['kind'], 'resolved_at' => null]), 201);
    }

    public function payment(Request $request): JsonResponse
    {
        $data = $request->validate(['client_reference' => 'required|uuid', 'amount' => 'required|integer|min:1|max:1000000', 'tip' => 'required|integer|min:0|max:100000', 'method' => 'required|in:cash,bank_transfer']);

        return response()->json($this->dining->requestPayment($request->attributes->get('dining_session'), $data), 201);
    }

    public function review(Request $request): JsonResponse
    {
        $data = $request->validate(['rating' => 'required|integer|min:1|max:5', 'comment' => 'nullable|string|max:1000']);
        $s = $request->attributes->get('dining_session');
        abort_unless($s->orders()->exists(), 422, 'Place an order before reviewing your visit.');

        return response()->json(Review::updateOrCreate(['table_session_id' => $s->id], $data), 201);
    }
}
