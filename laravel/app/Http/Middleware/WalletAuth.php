<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class WalletAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // ここでJWT検証ロジックを実装
        // 実際のプロジェクトではWalletAuthControllerのverifyJWTメソッドを使用

        return $next($request);
    }

}
// composer.jsonに以下を追加:
// "phpseclib/phpseclib": "^3.0"

