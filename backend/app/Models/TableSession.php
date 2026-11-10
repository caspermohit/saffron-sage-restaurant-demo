<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TableSession extends Model
{
    protected $fillable = ['id', 'dining_table_id', 'status', 'closed_at'];

    protected $casts = ['closed_at' => 'datetime'];

    public $incrementing = false;

    protected $keyType = 'string';

    public function table(): BelongsTo
    {
        return $this->belongsTo(DiningTable::class, 'dining_table_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(ServiceCall::class);
    }
}
