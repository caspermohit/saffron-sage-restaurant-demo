<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = ['table_session_id', 'client_reference', 'status', 'subtotal', 'tax', 'total', 'notes'];

    protected $casts = [];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(TableSession::class, 'table_session_id');
    }
}
