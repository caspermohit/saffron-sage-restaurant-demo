<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiningTable extends Model
{
    protected $fillable = ['name', 'zone', 'seats', 'qr_token'];

    protected $casts = [];

    public function sessions(): HasMany
    {
        return $this->hasMany(TableSession::class);
    }
}
