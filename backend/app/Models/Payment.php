<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['table_session_id', 'client_reference', 'amount', 'tip', 'method', 'status'];

    protected $casts = [];
}
