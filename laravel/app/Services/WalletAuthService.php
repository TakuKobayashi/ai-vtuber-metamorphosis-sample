<?php

namespace App\Services;

use App\Models\WalletUser;
use App\Models\AuthNonce;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class WalletAuthService
{
    /**
     * ウォレット認証用のナンスを生成
     */
    public function generateNonce($walletAddress)
    {
        try {
            // 既存の未使用ナンスを無効化
            AuthNonce::where('wallet_address', $walletAddress)
                ->where('used', false)
                ->update(['used' => true]);

            $nonce = Str::random(32);

            AuthNonce::create([
                'nonce' => $nonce,
                'wallet_address' => $walletAddress,
                'expires_at' => Carbon::now()->addMinutes(15) // 15分で期限切れ
            ]);

            return $nonce;

        } catch (\Exception $e) {
            Log::error('Nonce generation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 署名を検証してユーザーを認証
     */
    public function verifySignatureAndLogin($walletAddress, $signature, $nonce)
    {
        try {
            // ナンスの検証
            $authNonce = AuthNonce::where('nonce', $nonce)
                ->where('wallet_address', $walletAddress)
                ->first();

            if (!$authNonce || !$authNonce->isValid()) {
                throw new \Exception('Invalid or expired nonce');
            }

            // メッセージを構築
            $message = $this->buildSignMessage($walletAddress, $nonce);

            // 署名を検証（実際の実装では適切なXRP署名検証を行う）
            if (!$this->verifyXRPSignature($message, $signature, $walletAddress)) {
                throw new \Exception('Invalid signature');
            }

            // ナンスを使用済みにマーク
            $authNonce->markAsUsed();

            // ユーザーを作成または取得
            $user = WalletUser::firstOrCreate(
                ['wallet_address' => $walletAddress],
                ['last_login_at' => Carbon::now()]
            );

            if ($user->wasRecentlyCreated === false) {
                $user->update(['last_login_at' => Carbon::now()]);
            }

            // APIトークンを生成
            $token = $user->createToken('wallet-auth')->plainTextToken;

            return [
                'user' => $user,
                'token' => $token
            ];

        } catch (\Exception $e) {
            Log::error('Signature verification failed: ' . $e->getMessage());
            throw $e;
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
            "Timestamp: " . Carbon::now()->toISOString();
    }

    /**
     * XRP署名を検証（実際の実装では適切なライブラリを使用）
     */
    private function verifyXRPSignature($message, $signature, $walletAddress)
    {
        try {
            // 実際の実装では、xrpl.jsやripple-keypairsライブラリを使用
            // ここではサンプル実装

            // Node.jsスクリプトを呼び出して署名を検証
            $command = "node " . base_path('scripts/verify_signature.js') .
                " '" . base64_encode($message) . "' '" . $signature . "' '" . $walletAddress . "'";

            $result = shell_exec($command);
            $verification = json_decode($result, true);

            return $verification['valid'] ?? false;

        } catch (\Exception $e) {
            Log::error('Signature verification error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * ユーザープロフィールを更新
     */
    public function updateProfile(WalletUser $user, array $data)
    {
        try {
            $updateData = [];

            if (isset($data['username'])) {
                $updateData['username'] = $data['username'];
            }

            if (isset($data['email'])) {
                $updateData['email'] = $data['email'];
            }

            if (isset($data['avatar_url'])) {
                $updateData['avatar_url'] = $data['avatar_url'];
            }

            if (isset($data['profile_data'])) {
                $updateData['profile_data'] = array_merge(
                    $user->profile_data ?? [],
                    $data['profile_data']
                );
            }

            return $user->update($updateData);

        } catch (\Exception $e) {
            Log::error('Profile update failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーの統計情報を取得
     */
    public function getUserStats(WalletUser $user)
    {
        try {
            // 実際の実装では、関連するモデルから統計を取得
            $stats = [
                'total_nfts_owned' => $this->getTotalNFTsOwned($user),
                'total_nfts_created' => $this->getTotalNFTsCreated($user),
                'active_sell_offers' => $this->getActiveSellOffers($user),
                'active_buy_offers' => $this->getActiveBuyOffers($user),
                'total_volume_sold' => $this->getTotalVolumeSold($user),
                'total_volume_bought' => $this->getTotalVolumeBought($user),
                'member_since' => $user->created_at->format('Y-m-d'),
                'last_login' => $user->last_login_at ? $user->last_login_at->format('Y-m-d H:i:s') : null,
                'profile_completion' => $this->calculateProfileCompletion($user)
            ];

            return $stats;

        } catch (\Exception $e) {
            Log::error('Failed to get user stats: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 所有NFT数を取得
     */
    private function getTotalNFTsOwned(WalletUser $user)
    {
        // 実際の実装では NFT モデルから取得
        // return $user->nfts()->where('status', 'active')->count();
        return 5; // デモ用
    }

    /**
     * 作成NFT数を取得
     */
    private function getTotalNFTsCreated(WalletUser $user)
    {
        // 実際の実装では NFT モデルから取得
        // return \App\Models\NFT::where('issuer_address', $user->wallet_address)
        //                       ->where('status', 'active')->count();
        return 3; // デモ用
    }

    /**
     * アクティブな売却オファー数を取得
     */
    private function getActiveSellOffers(WalletUser $user)
    {
        // 実際の実装では NFTOffer モデルから取得
        // return $user->offers()->where('type', 'sell')
        //                       ->where('status', 'active')->count();
        return 2; // デモ用
    }

    /**
     * アクティブな購入オファー数を取得
     */
    private function getActiveBuyOffers(WalletUser $user)
    {
        // 実際の実装では NFTOffer モデルから取得
        // return $user->offers()->where('type', 'buy')
        //                       ->where('status', 'active')->count();
        return 1; // デモ用
    }

    /**
     * 総売却額を取得
     */
    private function getTotalVolumeSold(WalletUser $user)
    {
        // 実際の実装では NFTOffer モデルから取得
        // return $user->offers()->where('type', 'sell')
        //                       ->where('status', 'accepted')
        //                       ->sum('amount');
        return 15000000; // デモ用 (15 XRP)
    }

    /**
     * 総購入額を取得
     */
    private function getTotalVolumeBought(WalletUser $user)
    {
        // 実際の実装では NFTOffer モデルから取得
        // return $user->offers()->where('type', 'buy')
        //                       ->where('status', 'accepted')
        //                       ->sum('amount');
        return 8000000; // デモ用 (8 XRP)
    }

    /**
     * プロフィール完成度を計算
     */
    private function calculateProfileCompletion(WalletUser $user)
    {
        $completion = 0;
        $totalFields = 5;

        if ($user->username) $completion++;
        if ($user->email) $completion++;
        if ($user->avatar_url) $completion++;
        if ($user->profile_data && count($user->profile_data) > 0) $completion++;
        if ($user->wallet_address) $completion++; // 必須フィールド

        return round(($completion / $totalFields) * 100);
    }

    /**
     * ユーザーの活動履歴を取得
     */
    public function getUserActivity(WalletUser $user, $limit = 10)
    {
        try {
            // 実際の実装では、各種アクティビティログから取得
            $activities = [
                [
                    'type' => 'nft_minted',
                    'description' => 'NFT "Digital Art #001" を発行しました',
                    'timestamp' => Carbon::now()->subHours(2)->toISOString(),
                    'data' => ['nft_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE201']
                ],
                [
                    'type' => 'offer_created',
                    'description' => '5 XRPで売却オファーを作成しました',
                    'timestamp' => Carbon::now()->subHours(5)->toISOString(),
                    'data' => ['amount' => 5000000, 'type' => 'sell']
                ],
                [
                    'type' => 'profile_updated',
                    'description' => 'プロフィール情報を更新しました',
                    'timestamp' => Carbon::now()->subDays(1)->toISOString(),
                    'data' => ['field' => 'username']
                ],
                [
                    'type' => 'login',
                    'description' => 'ウォレットでログインしました',
                    'timestamp' => Carbon::now()->subDays(2)->toISOString(),
                    'data' => ['wallet_address' => $user->wallet_address]
                ]
            ];

            return array_slice($activities, 0, $limit);

        } catch (\Exception $e) {
            Log::error('Failed to get user activity: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーの設定を取得
     */
    public function getUserSettings(WalletUser $user)
    {
        $defaultSettings = [
            'notifications' => [
                'email_enabled' => false,
                'offer_received' => true,
                'offer_accepted' => true,
                'nft_sold' => true,
                'price_alerts' => false
            ],
            'privacy' => [
                'show_wallet_address' => false,
                'show_activity' => true,
                'show_collection' => true
            ],
            'trading' => [
                'auto_accept_threshold' => 0,
                'default_offer_duration' => 7, // days
                'preferred_currency' => 'XRP'
            ]
        ];

        return array_merge($defaultSettings, $user->profile_data['settings'] ?? []);
    }

    /**
     * ユーザーの設定を更新
     */
    public function updateUserSettings(WalletUser $user, array $settings)
    {
        try {
            $profileData = $user->profile_data ?? [];
            $profileData['settings'] = array_merge(
                $profileData['settings'] ?? [],
                $settings
            );

            return $user->update(['profile_data' => $profileData]);

        } catch (\Exception $e) {
            Log::error('Failed to update user settings: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーの通知設定を取得
     */
    public function getNotificationPreferences(WalletUser $user)
    {
        $settings = $this->getUserSettings($user);
        return $settings['notifications'] ?? [];
    }

    /**
     * ウォレットアドレスの形式を検証
     */
    public function validateWalletAddress($address)
    {
        // XRPLアドレスの基本的な形式チェック
        return preg_match('/^r[a-zA-Z0-9]{24,34}$/', $address);
    }

    /**
     * 秘密鍵の形式を検証
     */
    public function validateSecret($secret)
    {
        // XRPLシークレットの基本的な形式チェック
        return preg_match('/^s[a-zA-Z0-9]{25,34}$/', $secret);
    }

    /**
     * ナンスの有効性をチェック
     */
    public function isNonceValid($nonce, $walletAddress)
    {
        $authNonce = AuthNonce::where('nonce', $nonce)
            ->where('wallet_address', $walletAddress)
            ->first();

        return $authNonce && $authNonce->isValid();
    }

    /**
     * 期限切れのナンスをクリーンアップ
     */
    public function cleanupExpiredNonces()
    {
        try {
            $deletedCount = AuthNonce::where('expires_at', '<', Carbon::now())
                ->orWhere('used', true)
                ->delete();

            Log::info("Cleaned up {$deletedCount} expired/used nonces");

            return $deletedCount;

        } catch (\Exception $e) {
            Log::error('Failed to cleanup expired nonces: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーのセキュリティログを記録
     */
    public function logSecurityEvent(WalletUser $user, $event, $details = [])
    {
        try {
            $logData = [
                'user_id' => $user->id,
                'wallet_address' => $user->wallet_address,
                'event' => $event,
                'details' => $details,
                'ip_address' => request()->ip(),
                'user_agent' => request()->header('User-Agent'),
                'timestamp' => Carbon::now()->toISOString()
            ];

            Log::channel('security')->info('Security event', $logData);

        } catch (\Exception $e) {
            Log::error('Failed to log security event: ' . $e->getMessage());
        }
    }

    /**
     * ユーザーのアクセス頻度を分析
     */
    public function analyzeUserAccess(WalletUser $user)
    {
        try {
            $now = Carbon::now();
            $lastWeek = $now->copy()->subWeek();
            $lastMonth = $now->copy()->subMonth();

            // 実際の実装では、ログテーブルから取得
            $analysis = [
                'last_login' => $user->last_login_at,
                'login_frequency' => [
                    'last_7_days' => 5, // デモ用
                    'last_30_days' => 18, // デモ用
                ],
                'activity_score' => $this->calculateActivityScore($user),
                'risk_level' => $this->calculateRiskLevel($user),
                'suspicious_activity' => false
            ];

            return $analysis;

        } catch (\Exception $e) {
            Log::error('Failed to analyze user access: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーのアクティビティスコアを計算
     */
    private function calculateActivityScore(WalletUser $user)
    {
        // 各種アクティビティに基づいてスコアを計算
        $score = 0;

        // ログイン頻度
        if ($user->last_login_at && $user->last_login_at->diffInDays(Carbon::now()) < 7) {
            $score += 20;
        }

        // プロフィール完成度
        $score += $this->calculateProfileCompletion($user) * 0.3;

        // NFT活動
        $score += min($this->getTotalNFTsOwned($user) * 5, 30);

        // 取引活動
        $score += min($this->getActiveSellOffers($user) * 3, 20);

        return min($score, 100);
    }

    /**
     * ユーザーのリスクレベルを計算
     */
    private function calculateRiskLevel(WalletUser $user)
    {
        $riskFactors = 0;

        // 新規ユーザー
        if ($user->created_at->diffInDays(Carbon::now()) < 7) {
            $riskFactors += 1;
        }

        // プロフィール未完成
        if ($this->calculateProfileCompletion($user) < 50) {
            $riskFactors += 1;
        }

        // 最近のログインなし
        if (!$user->last_login_at || $user->last_login_at->diffInDays(Carbon::now()) > 30) {
            $riskFactors += 2;
        }

        if ($riskFactors >= 3) return 'high';
        if ($riskFactors >= 2) return 'medium';
        return 'low';
    }

    /**
     * デモ用認証（開発環境でのテスト用）
     */
    public function createDemoUser($walletAddress)
    {
        try {
            $user = WalletUser::firstOrCreate(
                ['wallet_address' => $walletAddress],
                [
                    'username' => 'DemoUser_' . substr($walletAddress, -6),
                    'last_login_at' => Carbon::now(),
                    'profile_data' => [
                        'demo' => true,
                        'created_via' => 'demo_auth'
                    ]
                ]
            );

            $token = $user->createToken('demo-auth')->plainTextToken;

            return [
                'user' => $user,
                'token' => $token
            ];

        } catch (\Exception $e) {
            Log::error('Demo user creation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ユーザーのバックアップデータを作成
     */
    public function createUserBackup(WalletUser $user)
    {
        try {
            $backup = [
                'user_data' => $user->toArray(),
                'stats' => $this->getUserStats($user),
                'activity' => $this->getUserActivity($user, 50),
                'settings' => $this->getUserSettings($user),
                'created_at' => Carbon::now()->toISOString()
            ];

            return $backup;

        } catch (\Exception $e) {
            Log::error('Failed to create user backup: ' . $e->getMessage());
            throw $e;
        }
    }
}

