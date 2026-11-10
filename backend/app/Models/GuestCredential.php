<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestCredential extends Model
{
    protected $fillable = ['table_session_id', 'token_hash', 'expires_at'];

    protected $casts = ['expires_at' => 'datetime'];
}
