<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = ['table_session_id', 'rating', 'comment'];

    protected $casts = [];
}
