<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dining_tables', function (Blueprint $t): void {
            $t->id();
            $t->string('name');
            $t->string('zone');
            $t->unsignedInteger('seats');
            $t->string('qr_token', 80)->unique();
            $t->timestamps();
        });
        Schema::create('menu_items', function (Blueprint $t): void {
            $t->id();
            $t->string('name');
            $t->string('category');
            $t->text('description');
            $t->unsignedInteger('price');
            $t->json('allergens');
            $t->unsignedTinyInteger('spice')->default(0);
            $t->string('image');
            $t->boolean('available')->default(true);
            $t->timestamps();
        });
        Schema::create('table_sessions', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->foreignId('dining_table_id')->constrained();
            $t->string('status')->default('open');
            $t->timestamp('closed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('guest_credentials', function (Blueprint $t): void {
            $t->id();
            $t->foreignUuid('table_session_id')->constrained();
            $t->string('token_hash', 64)->unique();
            $t->timestamp('expires_at');
            $t->timestamps();
        });
        Schema::create('orders', function (Blueprint $t): void {
            $t->id();
            $t->foreignUuid('table_session_id')->constrained();
            $t->uuid('client_reference');
            $t->string('status')->default('new');
            $t->unsignedInteger('subtotal');
            $t->unsignedInteger('tax');
            $t->unsignedInteger('total');
            $t->string('notes', 500)->nullable();
            $t->timestamps();
            $t->unique(['table_session_id', 'client_reference']);
        });
        Schema::create('order_items', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('menu_item_id')->constrained();
            $t->string('name');
            $t->string('size');
            $t->unsignedInteger('quantity');
            $t->unsignedInteger('unit_price');
            $t->timestamps();
        });
        Schema::create('service_calls', function (Blueprint $t): void {
            $t->id();
            $t->foreignUuid('table_session_id')->constrained();
            $t->string('kind');
            $t->timestamp('resolved_at')->nullable();
            $t->timestamps();
        });
        Schema::create('payments', function (Blueprint $t): void {
            $t->id();
            $t->foreignUuid('table_session_id')->constrained();
            $t->uuid('client_reference');
            $t->unsignedInteger('amount');
            $t->unsignedInteger('tip')->default(0);
            $t->string('method');
            $t->string('status')->default('pending');
            $t->timestamps();
            $t->unique(['table_session_id', 'client_reference']);
        });
        Schema::create('reviews', function (Blueprint $t): void {
            $t->id();
            $t->foreignUuid('table_session_id')->unique()->constrained();
            $t->unsignedTinyInteger('rating');
            $t->string('comment', 1000)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['reviews', 'payments', 'service_calls', 'order_items', 'orders', 'guest_credentials', 'table_sessions', 'menu_items', 'dining_tables'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
