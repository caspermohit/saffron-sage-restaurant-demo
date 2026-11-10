<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'table_session_id' => $this->table_session_id, 'status' => $this->status, 'subtotal' => $this->subtotal, 'tax' => $this->tax, 'total' => $this->total, 'notes' => $this->notes, 'created_at' => $this->created_at->toIso8601String(), 'table' => $this->whenLoaded('session', fn () => $this->session->table->name), 'items' => $this->whenLoaded('items')];
    }
}
