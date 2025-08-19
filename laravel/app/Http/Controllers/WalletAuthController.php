<?php
namespace App\Http\Controllers;

use App\Services\WalletAuthService;
use App\Models\WalletUser;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use phpseclib3\Crypt\Ed25519;

class WalletAuthController extends Controller
{
    private $authService;

    public function __construct(WalletAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * ウォレットアドレス用のノンス（ワンタイム）を生成
     * @param $address
     * @return mixed
     */
    public function getNonce($address)
    {
        // ウォレットアドレスの妥当性チェック
        if (!$this->isValidSolanaAddress($address)) {
            return response()->json(['error' => 'Invalid wallet address'], 400);
        }

        // ノンスを生成（5分間有効）
        $nonce = Str::random(32);
        $message = "Sign this message to authenticate with our application.\nNonce: {$nonce}";

        Cache::put("nonce_{$address}", $nonce, 300); // 5分間キャッシュ

        return response()->json([
            'nonce' => $nonce,
            'message' => $message
        ]);
    }

    /**
     * ナンス生成エンドポイント 旧ver
     * @param Request $request
     * @return mixed
     */
    public function generateNonce(Request $request)
    {
        $request->validate([
            'wallet_address' => 'required|string|regex:/^r[a-zA-Z0-9]{24,34}$/'
        ]);

        try {
            $nonce = $this->authService->generateNonce($request->wallet_address);

            return response()->json([
                'success' => true,
                'nonce' => $nonce,
                'message' => 'Please sign this message with your wallet to authenticate.',
                'expires_in' => 900, // 15分
                'sign_message' => $this->buildSignMessage($request->wallet_address, $nonce)
            ]);

        } catch (\Exception $e) {
            Log::error('Nonce generation failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate nonce: ' . $e->getMessage()
            ], 500);
        }
    }

//    /**
//     * ウォレット認証エンドポイント
//     */
//    public function authenticate(Request $request)
//    {
//        $request->validate([
//            'wallet_address' => 'required|string',
//            'signature' => 'required|string',
//            'nonce' => 'required|string'
//        ]);
//
//        try {
//            $result = $this->authService->verifySignatureAndLogin(
//                $request->wallet_address,
//                $request->signature,
//                $request->nonce
//            );
//
//            return response()->json([
//                'success' => true,
//                'user' => $result['user'],
//                'token' => $result['token'],
//                'message' => 'Authentication successful'
//            ]);
//
//        } catch (\Exception $e) {
//            Log::error('Authentication failed: ' . $e->getMessage());
//            return response()->json([
//                'success' => false,
//                'message' => 'Authentication failed: ' . $e->getMessage()
//            ], 401);
//        }
//    }

    /**
     * ウォレット署名を検証してJWTトークンを発行
     */
    public function authenticate(Request $request)
    {
        $request->validate([
            'publicKey' => 'required|string',
            'signature' => 'required|string',
            'message' => 'required|string'
        ]);

        $publicKey = $request->publicKey;
        $signature = $request->signature;
        $message = $request->message;

        // ノンスを抽出
        preg_match('/Nonce: ([a-zA-Z0-9]+)/', $message, $matches);
        if (!isset($matches[1])) {
            return response()->json(['error' => 'Invalid message format'], 400);
        }

        $nonce = $matches[1];
        $cachedNonce = Cache::get("nonce_{$publicKey}");

        if (!$cachedNonce || $cachedNonce !== $nonce) {
            return response()->json(['error' => 'Invalid or expired nonce'], 400);
        }

        // 署名を検証
        if (!$this->verifySignature($publicKey, $signature, $message)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        // ノンスを削除（一度使用したら無効）
        Cache::forget("nonce_{$publicKey}");

        // JWTトークンを生成
        $token = $this->generateJWT($publicKey);

        // セッションにウォレットアドレスを保存
        session(['wallet_address' => $publicKey]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'wallet_address' => $publicKey
        ]);
    }

    /**
     * ユーザープロフィール取得
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            $stats = $this->authService->getUserStats($user);

            return response()->json([
                'success' => true,
                'user' => $user,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * プロフィール更新
     */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'username' => 'nullable|string|max:50|unique:wallet_users,username,' . $request->user()->id,
            'email' => 'nullable|email|max:255',
            'avatar_url' => 'nullable|url|max:500',
            'profile_data' => 'nullable|array'
        ]);

        try {
            $user = $request->user();
            $this->authService->updateProfile($user, $request->only([
                'username', 'email', 'avatar_url', 'profile_data'
            ]));

            return response()->json([
                'success' => true,
                'user' => $user->fresh(),
                'message' => 'Profile updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ログアウト
     */
    public function logout(Request $request)
    {
        try {
            $request->user()->currentAccessToken()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Logged out successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * すべてのトークンを削除（全デバイスからログアウト）
     */
    public function logoutAll(Request $request)
    {
        try {
            $request->user()->tokens()->delete();

            return response()->json([
                'success' => true,
                'message' => 'Logged out from all devices'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout all failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ユーザーの統計情報を取得
     */
    public function getUserStats(Request $request)
    {
        try {
            $user = $request->user();
            $stats = $this->authService->getUserStats($user);

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get user stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ユーザーのオファー一覧を取得
     */
    public function getMyOffers(Request $request)
    {
        try {
            $user = $request->user();

            // デモ用のオファーデータ
            $offers = [
                [
                    'id' => 1,
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
                    'type' => 'sell',
                    'amount' => '5000000',
                    'status' => 'active',
                    'created_at' => '2025-01-15T10:00:00Z',
                    'nft' => [
                        'metadata' => [
                            'name' => 'My Crypto Kitty #142',
                            'image' => 'https://picsum.photos/400/400?random=2'
                        ]
                    ]
                ]
            ];

            return response()->json([
                'success' => true,
                'offers' => ['data' => $offers]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get offers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * アカウントのNFTを同期
     */
    public function syncAccountNFTs(Request $request)
    {
        try {
            $user = $request->user();

            // 実際の実装では NFTManagementService を使用
            // $nftService = new \App\Services\NFTManagementService($this->xrplService);
            // $syncedNFTs = $nftService->syncAccountNFTs($user->wallet_address);

            // デモ用の同期結果
            $syncedNFTs = [
                [
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
                    'metadata' => [
                        'name' => 'Synchronized NFT',
                        'description' => 'This NFT was synchronized from XRPL',
                        'image' => 'https://picsum.photos/400/400?random=sync'
                    ],
                    'owner_address' => $user->wallet_address
                ]
            ];

            return response()->json([
                'success' => true,
                'synced_nfts' => $syncedNFTs,
                'count' => count($syncedNFTs),
                'message' => 'NFTs synchronized successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync NFTs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ウォレット情報を検証
     */
    public function verifyWallet(Request $request)
    {
        $request->validate([
            'wallet_address' => 'required|string'
        ]);

        try {
            // ウォレットアドレスの形式を検証
            if (!preg_match('/^r[a-zA-Z0-9]{24,34}$/', $request->wallet_address)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid wallet address format'
                ], 400);
            }

            // 実際の実装では XRPL API を使用してアカウントの存在を確認
            $accountExists = true; // デモ用

            return response()->json([
                'success' => true,
                'wallet_address' => $request->wallet_address,
                'exists' => $accountExists,
                'message' => $accountExists ? 'Wallet address is valid' : 'Wallet address not found'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to verify wallet: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * JWTトークンを検証
     */
    public function verify(Request $request)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Token not provided'], 401);
        }

        $payload = $this->verifyJWT($token);

        if (!$payload) {
            return response()->json(['error' => 'Invalid token'], 401);
        }

        return response()->json([
            'success' => true,
            'wallet_address' => $payload['wallet_address']
        ]);
    }

    /**
     * Ed25519署名を検証
     */
    private function verifySignature($publicKey, $signature, $message)
    {
        try {
            // Base58デコード（Solanaの標準）
            $publicKeyBytes = $this->base58Decode($publicKey);
            $signatureBytes = $this->base58Decode($signature);

            if (strlen($publicKeyBytes) !== 32 || strlen($signatureBytes) !== 64) {
                return false;
            }

            $key = Ed25519::loadPublicKey($publicKeyBytes);
            return $key->verify($message, $signatureBytes);

        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * 簡単なJWT生成
     */
    private function generateJWT($walletAddress)
    {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'wallet_address' => $walletAddress,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24) // 24時間有効
        ]);

        $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, env('APP_KEY'), true);
        $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64Header . "." . $base64Payload . "." . $base64Signature;
    }

    /**
     * JWT検証
     */
    private function verifyJWT($token)
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[0]));
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
        $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));

        $expectedSignature = hash_hmac('sha256', $parts[0] . "." . $parts[1], env('APP_KEY'), true);

        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }

        $payloadData = json_decode($payload, true);

        // 有効期限チェック
        if ($payloadData['exp'] < time()) {
            return false;
        }

        return $payloadData;
    }

    /**
     * Solanaアドレスの妥当性チェック
     */
    private function isValidSolanaAddress($address)
    {
        return strlen($address) >= 32 && strlen($address) <= 44 && ctype_alnum($address);
    }

    /**
     * Base58デコード
     */
    private function base58Decode($string)
    {
        $alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        $decoded = 0;
        $multi = 1;
        $length = strlen($string);

        for ($i = $length - 1; $i >= 0; $i--) {
            $pos = strpos($alphabet, $string[$i]);
            if ($pos === false) {
                throw new Exception("Invalid character in base58 string");
            }
            $decoded += $multi * $pos;
            $multi *= 58;
        }

        // Convert to binary string
        $binary = '';
        while ($decoded > 0) {
            $binary = chr($decoded % 256) . $binary;
            $decoded = intval($decoded / 256);
        }

        // Handle leading zeros
        for ($i = 0; $i < $length && $string[$i] === '1'; $i++) {
            $binary = "\x00" . $binary;
        }

        return $binary;
    }

    /**
     * 署名用メッセージを構築
     */
    private function buildSignMessage($walletAddress, $nonce)
    {
        return "Welcome to XRPL NFT Marketplace!\n\n" .
            "Please sign this message to verify your wallet ownership.\n\n" .
            "Wallet: {$walletAddress}\n" .
            "Nonce: {$nonce}\n" .
            "Timestamp: " . now()->toISOString();
    }

    /**
     * デモ用認証（開発時のみ使用）
     */
    public function demoAuth(Request $request)
    {
        if (!app()->environment('local')) {
            return response()->json([
                'success' => false,
                'message' => 'Demo auth only available in local environment'
            ], 403);
        }

        $request->validate([
            'wallet_address' => 'required|string'
        ]);

        try {
            // デモ用ユーザーを作成または取得
            $user = WalletUser::firstOrCreate(
                ['wallet_address' => $request->wallet_address],
                [
                    'username' => 'DemoUser_' . substr($request->wallet_address, -6),
                    'last_login_at' => now()
                ]
            );

            // APIトークンを生成
            $token = $user->createToken('demo-auth')->plainTextToken;

            return response()->json([
                'success' => true,
                'user' => $user,
                'token' => $token,
                'message' => 'Demo authentication successful'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Demo auth failed: ' . $e->getMessage()
            ], 500);
        }
    }
}
