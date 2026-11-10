<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    protected $fillable = ['name', 'category', 'description', 'price', 'allergens', 'spice', 'image', 'available'];

    protected $casts = ['allergens' => 'array', 'available' => 'boolean', 'price' => 'integer', 'spice' => 'integer'];
}
