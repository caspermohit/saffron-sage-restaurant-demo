<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\DiningTable;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Review;
use App\Models\ServiceCall;
use App\Models\TableSession;
use App\Services\DiningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function __construct(private DiningService $dining) {}

    public function state(): JsonResponse
    {
        $tables = DiningTable::with(['sessions' => fn ($q) => $q->where('status', 'open')->with(['orders.items', 'payments', 'calls' => fn ($q) => $q->whereNull('resolved_at')])])->get()->map(function ($t): array {
            $s = $t->sessions->first();

            return ['id' => $t->id, 'name' => $t->name, 'zone' => $t->zone, 'seats' => $t->seats, 'qr_token' => $t->qr_token, 'session_id' => $s?->id, 'bill' => $s ? $this->dining->bill($s) : null, 'calls' => $s?->calls ?? [], 'orders' => $s?->orders ?? []];
        });

        return response()->json(['restaurant' => config('restaurant.name'), 'currency' => config('restaurant.currency'), 'tables' => $tables, 'orders' => OrderResource::collection(Order::with(['items', 'session.table'])->whereHas('session', fn ($q) => $q->where('status', 'open'))->latest()->get()), 'calls' => ServiceCall::with('session.table')->whereNull('resolved_at')->get(), 'payments' => Payment::where('status', 'pending')->get(), 'menu' => MenuItem::all(), 'reviews' => Review::latest()->limit(20)->get(), 'stats' => ['revenue' => (int) Payment::where('status', 'paid')->whereDate('updated_at', today())->sum('amount'), 'tips' => (int) Payment::where('status', 'paid')->whereDate('updated_at', today())->sum('tip'), 'orders' => Order::whereDate('created_at', today())->count(), 'rating' => round((float) Review::avg('rating'), 1)]]);
    }

    public function status(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:preparing,ready,served']);

        return DB::transaction(function () use ($order, $data): JsonResponse {
            $order = Order::whereKey($order->id)->lockForUpdate()->firstOrFail();
            $next = ['new' => 'preparing', 'preparing' => 'ready', 'ready' => 'served'];
            abort_unless(($next[$order->status] ?? null) === $data['status'], 422, 'Invalid order status transition. Refresh the kitchen.');
            $order->update($data);

            return response()->json(['message' => 'Order updated.']);
        });
    }

    public function resolve(ServiceCall $call): JsonResponse
    {
        $call->update(['resolved_at' => now()]);

        return response()->json(['message' => 'Request resolved.']);
    }

    public function settle(Payment $payment): JsonResponse
    {
        return DB::transaction(function () use ($payment): JsonResponse {
            TableSession::whereKey($payment->table_session_id)->lockForUpdate()->firstOrFail();
            $payment->refresh();
            abort_unless($payment->status === 'pending', 409, 'Payment already processed.');
            $payment->update(['status' => 'paid']);

            return response()->json(['message' => 'Payment confirmed.']);
        });
    }

    public function close(TableSession $session): JsonResponse
    {
        return DB::transaction(function () use ($session): JsonResponse {
            $session = TableSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            $bill = $this->dining->bill($session);
            abort_if($bill['total'] !== $bill['paid'] || $bill['pending'] > 0, 422, 'Settle the full bill before closing this table.');
            abort_if($session->orders()->where('status', '!=', 'served')->exists(), 422, 'Serve all orders before closing this table.');
            $session->calls()->whereNull('resolved_at')->update(['resolved_at' => now()]);
            $session->update(['status' => 'closed', 'closed_at' => now()]);

            return response()->json(['message' => 'Table is ready for the next guests.']);
        });
    }

    public function availability(Request $request, MenuItem $item): JsonResponse
    {
        $item->update($request->validate(['available' => 'required|boolean']));

        return response()->json(['message' => 'Menu updated.']);
    }
}
