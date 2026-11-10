<?php

namespace App\Services;

use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\TableSession;
use Illuminate\Support\Facades\DB;

class DiningService
{
    public function bill(TableSession $session): array
    {
        $total = (int) $session->orders()->sum('total');
        $paid = (int) $session->payments()->where('status', 'paid')->sum('amount');
        $pending = (int) $session->payments()->where('status', 'pending')->sum('amount');

        return ['total' => $total, 'paid' => $paid, 'pending' => $pending, 'remaining' => max(0, $total - $paid - $pending)];
    }

    public function order(TableSession $session, array $data): Order
    {
        return DB::transaction(function () use ($session, $data): Order {
            $session = TableSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            abort_unless($session->status === 'open', 409, 'This session is closed.');
            $existing = $session->orders()->where('client_reference', $data['client_reference'])->first();
            if ($existing) {
                return $existing->load('items');
            }
            abort_if($session->payments()->exists(), 409, 'The bill is being settled. Ask your server before ordering more.');
            $rows = [];
            $subtotal = 0;
            foreach ($data['items'] as $line) {
                $item = MenuItem::whereKey($line['menu_item_id'])->where('available', true)->first();
                abort_unless($item, 422, 'A selected dish is unavailable. Refresh the menu.');
                $unit = $line['size'] === 'large' ? (int) round($item->price * 1.5) : $item->price;
                $rows[] = ['menu_item_id' => $item->id, 'name' => $item->name, 'size' => $line['size'], 'quantity' => $line['quantity'], 'unit_price' => $unit];
                $subtotal += $unit * $line['quantity'];
            }
            $tax = (int) round($subtotal * config('restaurant.tax_percent') / 100);
            $order = $session->orders()->create(['client_reference' => $data['client_reference'], 'notes' => $data['notes'] ?? null, 'subtotal' => $subtotal, 'tax' => $tax, 'total' => $subtotal + $tax]);
            $order->items()->createMany($rows);

            return $order->load('items');
        });
    }

    public function requestPayment(TableSession $session, array $data): Payment
    {
        return DB::transaction(function () use ($session, $data): Payment {
            $session = TableSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            abort_unless($session->status === 'open', 409, 'This session is closed.');
            $existing = $session->payments()->where('client_reference', $data['client_reference'])->first();
            if ($existing) {
                return $existing;
            }
            abort_if($data['amount'] > $this->bill($session)['remaining'], 422, 'That amount exceeds the unallocated bill balance.');

            return $session->payments()->create($data);
        });
    }
}
