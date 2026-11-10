<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\StaffController;
use App\Http\Middleware\GuestSession;
use Illuminate\Support\Facades\Route;

Route::get('/demo', [GuestController::class, 'demo'])->middleware('throttle:menu-read');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:staff-login');
Route::get('/menu/{token}', [GuestController::class, 'menu'])->middleware('throttle:menu-read');
Route::post('/menu/{token}/open', [GuestController::class, 'open'])->middleware('throttle:table-open');
Route::prefix('sessions/{session}')->middleware([GuestSession::class, 'throttle:guest-read'])->group(function (): void {
    Route::get('/', [GuestController::class, 'state']);
    Route::post('/orders', [GuestController::class, 'order'])->middleware('throttle:guest-action');
    Route::post('/calls', [GuestController::class, 'call'])->middleware('throttle:guest-action');
    Route::post('/payments', [GuestController::class, 'payment'])->middleware('throttle:guest-action');
    Route::post('/review', [GuestController::class, 'review'])->middleware('throttle:guest-action');
});
Route::prefix('staff')->middleware('auth:sanctum')->group(function (): void {
    Route::get('/state', [StaffController::class, 'state']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::patch('/orders/{order}', [StaffController::class, 'status']);
    Route::post('/calls/{call}/resolve', [StaffController::class, 'resolve']);
    Route::post('/payments/{payment}/confirm', [StaffController::class, 'settle']);
    Route::post('/sessions/{session}/close', [StaffController::class, 'close']);
    Route::patch('/menu/{item}', [StaffController::class, 'availability']);
});
