<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceCall extends Model
{
    protected $fillable = ['table_session_id', 'kind', 'resolved_at'];

    protected $casts = ['resolved_at' => 'datetime'];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TableSession::class, 'table_session_id');
    }
}
