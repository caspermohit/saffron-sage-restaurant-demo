<?php

namespace App\Http\Middleware;

use App\Models\GuestCredential;
use App\Models\TableSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class GuestSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $credential = GuestCredential::where('token_hash', hash('sha256', $request->header('X-Guest-Token', '')))->where('table_session_id', $request->route('session'))->where('expires_at', '>', now())->first();
        abort_unless($credential, 403, 'Your table access has expired. Scan the QR code again.');
        $session = TableSession::findOrFail($request->route('session'));
        abort_unless($session->status === 'open', 409, 'This table session is closed.');
        $request->attributes->set('dining_session', $session);

        return $next($request);
    }
}
