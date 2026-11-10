<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = ['order_id', 'menu_item_id', 'name', 'size', 'quantity', 'unit_price'];

    protected $casts = [];
}
