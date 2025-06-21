<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ヘルスチェック
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0'
    ]);
});

// 認証関連ルート（認証不要）
Route::prefix('auth')->group(function () {
    Route::post('/nonce', [WalletAuthController::class, 'generateNonce']);
    Route::post('/authenticate', [WalletAuthController::class, 'authenticate']);
    Route::post('/verify-wallet', [WalletAuthController::class, 'verifyWallet']);

    // デモ認証（開発環境のみ）
    Route::post('/demo', [WalletAuthController::class, 'demoAuth']);
});

// 認証が必要なルート
Route::middleware(['auth:sanctum'])->group(function () {
    // プロフィール管理
    Route::prefix('auth')->group(function () {
        Route::get('/profile', [WalletAuthController::class, 'getProfile']);
        Route::put('/profile', [WalletAuthController::class, 'updateProfile']);
        Route::post('/logout', [WalletAuthController::class, 'logout']);
        Route::post('/logout-all', [WalletAuthController::class, 'logoutAll']);
        Route::get('/stats', [WalletAuthController::class, 'getUserStats']);
        Route::get('/activity', [WalletAuthController::class, 'getUserActivity']);
        Route::get('/offers', [WalletAuthController::class, 'getMyOffers']);
        Route::post('/sync-nfts', [WalletAuthController::class, 'syncAccountNFTs']);
    });

    // XRPL機能（認証済みユーザーのみ）
    Route::prefix('xrpl')->group(function () {
        // セキュアなNFT操作
        Route::post('/mint-nft-secure', [TokenController::class, 'mintNFTSecure']);
        Route::post('/burn-nft-secure', [TokenController::class, 'burnNFTSecure']);
        Route::post('/create-sell-offer-secure', [TokenController::class, 'createSellOfferSecure']);
        Route::post('/create-buy-offer-secure', [TokenController::class, 'createBuyOfferSecure']);

        // ユーザー専用データアクセス
        Route::get('/my-nfts', [TokenController::class, 'getMyNFTs']);
        Route::get('/my-offers', [TokenController::class, 'getMyOffers']);
        Route::get('/my-stats', [TokenController::class, 'getMyStats']);
        Route::get('/my-activity', [TokenController::class, 'getMyActivity']);

        // 管理機能
        Route::post('/sync-my-nfts', [TokenController::class, 'syncMyNFTs']);
        Route::post('/update-metadata/{nft_token_id}', [TokenController::class, 'updateNFTMetadata']);
    });
});

// 公開ルート（認証不要）
Route::prefix('xrpl')->group(function () {
    // 基本的なXRPL操作
    Route::post('/issue-token', [TokenController::class, 'issueToken']);
    Route::get('/balance', [TokenController::class, 'getBalance']);
    Route::post('/mint-nft', [TokenController::class, 'mintNFT']);
    Route::post('/burn-nft', [TokenController::class, 'burnNFT']);
    Route::post('/create-sell-offer', [TokenController::class, 'createSellOffer']);
    Route::post('/create-buy-offer', [TokenController::class, 'createBuyOffer']);

    // 読み取り専用の公開API
    Route::get('/marketplace/nfts', [TokenController::class, 'getMarketplaceNFTs']);
    Route::get('/marketplace/nft/{nft_token_id}', [TokenController::class, 'getNFTDetails']);
    Route::get('/marketplace/stats', [TokenController::class, 'getMarketplaceStats']);
    Route::get('/marketplace/trending', [TokenController::class, 'getTrendingNFTs']);
    Route::get('/marketplace/recent', [TokenController::class, 'getRecentNFTs']);
    Route::get('/marketplace/top-creators', [TokenController::class, 'getTopCreators']);
    Route::get('/marketplace/top-collectors', [TokenController::class, 'getTopCollectors']);

    // アカウント情報
    Route::get('/account/{address}', [TokenController::class, 'getAccountInfo']);
    Route::get('/account-nfts/{address}', [TokenController::class, 'getAccountNFTs']);
    Route::get('/account-offers/{address}', [TokenController::class, 'getAccountOffers']);
    Route::get('/account-stats/{address}', [TokenController::class, 'getAccountStats']);

    // NFT情報
    Route::get('/nft/{nft_token_id}', [TokenController::class, 'getNFTDetails']);
    Route::get('/nft-offers/{nft_token_id}', [TokenController::class, 'getNFTOffers']);
    Route::get('/nft-history/{nft_token_id}', [TokenController::class, 'getNFTHistory']);
    Route::get('/nft-metadata/{nft_token_id}', [TokenController::class, 'getNFTMetadata']);

    // 検索・フィルタリング
    Route::get('/search', [TokenController::class, 'searchNFTs']);
    Route::get('/filter', [TokenController::class, 'filterNFTs']);
    Route::get('/categories', [TokenController::class, 'getCategories']);
    Route::get('/collections', [TokenController::class, 'getCollections']);
    Route::get('/collection/{issuer_address}', [TokenController::class, 'getCollection']);

    // 統計・分析
    Route::get('/stats/daily', [TokenController::class, 'getDailyStats']);
    Route::get('/stats/weekly', [TokenController::class, 'getWeeklyStats']);
    Route::get('/stats/monthly', [TokenController::class, 'getMonthlyStats']);
    Route::get('/price-history/{nft_token_id}', [TokenController::class, 'getPriceHistory']);
    Route::get('/volume-chart', [TokenController::class, 'getVolumeChart']);

    // レジャー情報
    Route::get('/ledger-info', [TokenController::class, 'getLedgerInfo']);
    Route::get('/server-info', [TokenController::class, 'getServerInfo']);
});

// 管理者用ルート（管理者のみアクセス可能）
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // ユーザー管理
    Route::get('/users', [TokenController::class, 'getAllUsers']);
    Route::get('/users/{id}', [TokenController::class, 'getUserById']);
    Route::put('/users/{id}/status', [TokenController::class, 'updateUserStatus']);
    Route::delete('/users/{id}', [TokenController::class, 'deleteUser']);

    // NFT管理
    Route::get('/nfts', [TokenController::class, 'getAllNFTs']);
    Route::put('/nfts/{id}/status', [TokenController::class, 'updateNFTStatus']);
    Route::delete('/nfts/{id}', [TokenController::class, 'deleteNFT']);

    // オファー管理
    Route::get('/offers', [TokenController::class, 'getAllOffers']);
    Route::put('/offers/{id}/status', [TokenController::class, 'updateOfferStatus']);
    Route::delete('/offers/{id}', [TokenController::class, 'deleteOffer']);

    // システム統計
    Route::get('/system-stats', [TokenController::class, 'getSystemStats']);
    Route::get('/audit-logs', [TokenController::class, 'getAuditLogs']);
    Route::post('/maintenance-mode', [TokenController::class, 'toggleMaintenanceMode']);
});

// Webhook用ルート（外部システムからの通知用）
Route::prefix('webhooks')->group(function () {
    Route::post('/xrpl-transaction', [TokenController::class, 'handleXRPLWebhook']);
    Route::post('/metadata-update', [TokenController::class, 'handleMetadataWebhook']);
    Route::post('/price-update', [TokenController::class, 'handlePriceWebhook']);
});

// レート制限付きのパブリックAPI
Route::middleware(['throttle:60,1'])->prefix('public')->group(function () {
    Route::get('/featured-nfts', [TokenController::class, 'getFeaturedNFTs']);
    Route::get('/hot-collections', [TokenController::class, 'getHotCollections']);
    Route::get('/price-alerts', [TokenController::class, 'getPriceAlerts']);
    Route::get('/market-trends', [TokenController::class, 'getMarketTrends']);
});

// エラーハンドリング用のフォールバックルート
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'API endpoint not found',
        'available_endpoints' => [
            'auth' => '/api/auth/*',
            'xrpl' => '/api/xrpl/*',
            'health' => '/api/health'
        ]
    ], 404);
});

// CORS設定（必要に応じてconfig/cors.phpで設定）
Route::options('{any}', function () {
    return response('', 200)
        ->header('Access-Control-Allow-Origin', '*')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
})->where('any', '.*');

/*
API使用例:

1. ウォレット認証:
   POST /api/auth/nonce {"wallet_address": "rXXX..."}
   POST /api/auth/authenticate {"wallet_address": "rXXX...", "signature": "...", "nonce": "..."}

2. NFT発行:
   POST /api/xrpl/mint-nft-secure {"uri": "https://...", "transferable": true}

3. マーケットプレイス:
   GET /api/xrpl/marketplace/nfts?page=1&limit=12
   GET /api/xrpl/marketplace/stats

4. 検索:
   GET /api/xrpl/search?q=digital+art&category=art

5. ユーザー情報:
   GET /api/auth/profile
   GET /api/xrpl/my-nfts

レスポンス形式:
{
  "success": true,
  "data": {...},
  "message": "Success",
  "pagination": {...} // 必要に応じて
}
*/
