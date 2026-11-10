<?php

use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Services\DiningService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('restaurant:demo', function (): void {
    if (! app()->environment('local') && ! config('restaurant.demo_mode')) {
        $this->error('Demo fixtures require local mode or RESTAURANT_DEMO_MODE=true.');

        return;
    }
    if (Order::exists()) {
        $this->info('Existing orders found; leaving data unchanged.');

        return;
    }
    $service = app(DiningService::class);
    $pasta = MenuItem::where('name', 'Basil pesto farfalle')->firstOrFail();
    $drink = MenuItem::where('name', 'House lemonade')->firstOrFail();
    foreach ([1 => 'served', 3 => 'preparing', 4 => 'new', 6 => 'ready', 8 => 'preparing', 10 => 'new'] as $number => $status) {
        $table = DiningTable::where('name', sprintf('Table %02d', $number))->firstOrFail();
        $session = $table->sessions()->create(['id' => (string) Str::uuid()]);
        $order = $service->order($session, ['client_reference' => (string) Str::uuid(), 'items' => [['menu_item_id' => $pasta->id, 'quantity' => 2, 'size' => 'regular'], ['menu_item_id' => $drink->id, 'quantity' => 2, 'size' => 'regular']], 'notes' => $number === 6 ? 'Please bring extra napkins.' : null]);
        $order->update(['status' => $status, 'created_at' => now()->subMinutes($number * 2)]);
        if (in_array($number, [3, 8])) {
            $session->calls()->create(['kind' => $number === 3 ? 'waiter' : 'water']);
        }
    }
    $this->info('Six sample tables created. These are demo visits, not real sales.');
})->purpose('Create sample restaurant visits in local/shared-demo mode without replacing orders');

Artisan::command('restaurant:prepare-database', function (): void {
    if (DB::connection()->getDriverName() !== 'pgsql') {
        return;
    }
    $schema = config('database.connections.pgsql.search_path');
    if (! is_string($schema) || ! preg_match('/^[a-z_][a-z0-9_]*$/', $schema)) {
        throw new RuntimeException('DB_SCHEMA must be a single lowercase PostgreSQL schema name.');
    }
    DB::statement('CREATE SCHEMA IF NOT EXISTS "'.$schema.'"');
    $this->info('Application database schema is ready.');
})->purpose('Create the dedicated PostgreSQL schema before the first migration');
