<?php
namespace App\Http\Controllers;

use App\Services\WalletAuthService;
use App\Models\WalletUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WalletAuthController extends Controller
{
    private $authService;

    public function __construct(WalletAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * ナンス生成エンドポイント
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

    /**
     * ウォレット認証エンドポイント
     */
    public function authenticate(Request $request)
    {
        $request->validate([
            'wallet_address' => 'required|string',
            'signature' => 'required|string',
            'nonce' => 'required|string'
        ]);

        try {
            $result = $this->authService->verifySignatureAndLogin(
                $request->wallet_address,
                $request->signature,
                $request->nonce
            );

            return response()->json([
                'success' => true,
                'user' => $result['user'],
                'token' => $result['token'],
                'message' => 'Authentication successful'
            ]);

        } catch (\Exception $e) {
            Log::error('Authentication failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Authentication failed: ' . $e->getMessage()
            ], 401);
        }
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
