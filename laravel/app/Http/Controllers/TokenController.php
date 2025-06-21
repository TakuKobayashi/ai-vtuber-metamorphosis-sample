<?php
namespace App\Http\Controllers;

use App\Services\XRPLTokenService;
use App\Services\NFTManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TokenController extends Controller
{
    private $xrplService;

    public function __construct(XRPLTokenService $xrplService)
    {
        $this->xrplService = $xrplService;
    }

    /**
     * トークンを発行
     */
    public function issueToken(Request $request)
    {
        $request->validate([
            'issuer_address' => 'required|string',
            'issuer_secret' => 'required|string',
            'holder_address' => 'required|string',
            'currency_code' => 'required|string|max:3',
            'amount' => 'required|numeric|min:0'
        ]);

        try {
            $result = $this->xrplService->issueToken(
                $request->issuer_address,
                $request->holder_address,
                $request->currency_code,
                $request->amount,
                $request->issuer_secret
            );

            return response()->json([
                'success' => true,
                'transaction_hash' => $result['hash'] ?? null,
                'message' => 'Token issued successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Token issuance failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * トークン残高を確認
     */
    public function getBalance(Request $request)
    {
        $request->validate([
            'address' => 'required|string',
            'currency_code' => 'required|string',
            'issuer' => 'required|string'
        ]);

        $balance = $this->xrplService->getTokenBalance(
            $request->address,
            $request->currency_code,
            $request->issuer
        );

        return response()->json([
            'address' => $request->address,
            'currency' => $request->currency_code,
            'issuer' => $request->issuer,
            'balance' => $balance
        ]);
    }

    /**
     * NFTを発行
     */
    public function mintNFT(Request $request)
    {
        $request->validate([
            'minter_address' => 'required|string',
            'minter_secret' => 'required|string',
            'uri' => 'nullable|string|max:512',
            'taxon' => 'nullable|integer|min:0|max:4294967295',
            'transferable' => 'nullable|boolean',
            'only_xrp' => 'nullable|boolean',
            'burnable' => 'nullable|boolean',
            'transfer_fee' => 'nullable|integer|min:0|max:50000'
        ]);

        try {
            $options = array_filter([
                'uri' => $request->uri,
                'taxon' => $request->taxon,
                'transferable' => $request->transferable,
                'only_xrp' => $request->only_xrp,
                'burnable' => $request->burnable,
                'transfer_fee' => $request->transfer_fee
            ], function($value) {
                return $value !== null;
            });

            $result = $this->xrplService->mintNFT(
                $request->minter_address,
                $request->minter_secret,
                $options
            );

            return response()->json([
                'success' => true,
                'transaction_hash' => $result['hash'] ?? null,
                'nft_token_id' => $result['result']['meta']['CreatedNode'][0]['NewFields']['NFTokenID'] ?? null,
                'message' => 'NFT minted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'NFT minting failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * 認証済みユーザーのNFT発行（署名処理をサーバーサイドで実行）
     */
    public function mintNFTSecure(Request $request)
    {
        $request->validate([
            'uri' => 'nullable|string|max:512',
            'taxon' => 'nullable|integer|min:0|max:4294967295',
            'transferable' => 'nullable|boolean',
            'only_xrp' => 'nullable|boolean',
            'burnable' => 'nullable|boolean',
            'transfer_fee' => 'nullable|integer|min:0|max:50000'
        ]);

        $user = $request->user();

        try {
            // ユーザーの秘密鍵を安全に取得（実際の実装では適切な暗号化ストレージを使用）
            $userSecret = $this->getUserSecret($user->wallet_address);

            if (!$userSecret) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallet secret not configured. Please set up your wallet first.'
                ], 400);
            }

            $nftService = new NFTManagementService($this->xrplService);

            $options = array_filter([
                'uri' => $request->uri,
                'taxon' => $request->taxon,
                'transferable' => $request->transferable,
                'only_xrp' => $request->only_xrp,
                'burnable' => $request->burnable,
                'transfer_fee' => $request->transfer_fee
            ], function($value) {
                return $value !== null;
            });

            $nft = $nftService->mintAndStore(
                $user->wallet_address,
                $userSecret,
                $options
            );

            return response()->json([
                'success' => true,
                'nft' => $nft,
                'message' => 'NFT minted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'NFT minting failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NFTをburn（削除）
     */
    public function burnNFT(Request $request)
    {
        $request->validate([
            'owner_address' => 'required|string',
            'owner_secret' => 'required|string',
            'nft_token_id' => 'required|string'
        ]);

        try {
            $result = $this->xrplService->burnNFT(
                $request->owner_address,
                $request->owner_secret,
                $request->nft_token_id
            );

            return response()->json([
                'success' => true,
                'transaction_hash' => $result['hash'] ?? null,
                'message' => 'NFT burned successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'NFT burning failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NFTの売却オファーを作成
     */
    public function createSellOffer(Request $request)
    {
        $request->validate([
            'owner_address' => 'required|string',
            'owner_secret' => 'required|string',
            'nft_token_id' => 'required|string',
            'amount' => 'required|string',
            'destination' => 'nullable|string'
        ]);

        try {
            $result = $this->xrplService->createSellOffer(
                $request->owner_address,
                $request->owner_secret,
                $request->nft_token_id,
                $request->amount,
                $request->destination
            );

            return response()->json([
                'success' => true,
                'transaction_hash' => $result['hash'] ?? null,
                'message' => 'Sell offer created successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sell offer creation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NFTの購入オファーを作成
     */
    public function createBuyOffer(Request $request)
    {
        $request->validate([
            'buyer_address' => 'required|string',
            'buyer_secret' => 'required|string',
            'nft_token_id' => 'required|string',
            'amount' => 'required|string',
            'owner' => 'required|string'
        ]);

        try {
            $result = $this->xrplService->createBuyOffer(
                $request->buyer_address,
                $request->buyer_secret,
                $request->nft_token_id,
                $request->amount,
                $request->owner
            );

            return response()->json([
                'success' => true,
                'transaction_hash' => $result['hash'] ?? null,
                'message' => 'Buy offer created successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Buy offer creation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * アカウントが所有するNFTを取得
     */
    public function getAccountNFTs(Request $request, $address)
    {
        try {
            $nfts = $this->xrplService->getAccountNFTs($address);

            return response()->json([
                'success' => true,
                'address' => $address,
                'nfts' => $nfts['result']['account_nfts'] ?? [],
                'count' => count($nfts['result']['account_nfts'] ?? [])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get NFTs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NFTのオファー情報を取得
     */
    public function getNFTOffers(Request $request, $nftTokenId)
    {
        try {
            $offers = $this->xrplService->getNFTOffers($nftTokenId);

            return response()->json([
                'success' => true,
                'nft_token_id' => $nftTokenId,
                'sell_offers' => $offers['sell_offers']['result']['offers'] ?? [],
                'buy_offers' => $offers['buy_offers']['result']['offers'] ?? []
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get NFT offers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * マーケットプレイスのNFT一覧を取得
     */
    public function getMarketplaceNFTs(Request $request)
    {
        try {
            // デモ用のサンプルデータ
            $nfts = [
                [
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE201',
                    'metadata' => [
                        'name' => 'Digital Art #001',
                        'description' => 'Beautiful digital artwork created by AI',
                        'image' => 'https://picsum.photos/400/400?random=1',
                        'attributes' => [
                            ['trait_type' => 'Color', 'value' => 'Blue'],
                            ['trait_type' => 'Rarity', 'value' => 'Rare'],
                            ['trait_type' => 'Style', 'value' => 'Abstract']
                        ]
                    ],
                    'lowest_price' => 5000000,
                    'owner_address' => 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
                    'created_at' => '2025-01-15T10:00:00Z'
                ],
                [
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
                    'metadata' => [
                        'name' => 'Crypto Kitty #142',
                        'description' => 'Adorable digital cat with unique traits',
                        'image' => 'https://picsum.photos/400/400?random=2',
                        'attributes' => [
                            ['trait_type' => 'Eyes', 'value' => 'Green'],
                            ['trait_type' => 'Fur', 'value' => 'Striped'],
                            ['trait_type' => 'Background', 'value' => 'Galaxy']
                        ]
                    ],
                    'lowest_price' => 12000000,
                    'owner_address' => 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                    'created_at' => '2025-01-14T15:30:00Z'
                ],
                [
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE203',
                    'metadata' => [
                        'name' => 'Music Note #777',
                        'description' => 'Unique musical composition stored as NFT',
                        'image' => 'https://picsum.photos/400/400?random=3',
                        'attributes' => [
                            ['trait_type' => 'Genre', 'value' => 'Electronic'],
                            ['trait_type' => 'Tempo', 'value' => '120 BPM'],
                            ['trait_type' => 'Key', 'value' => 'C Major']
                        ]
                    ],
                    'lowest_price' => 8500000,
                    'owner_address' => 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                    'created_at' => '2025-01-13T09:15:00Z'
                ]
            ];

            $stats = [
                'total_nfts' => 1247,
                'total_offers' => 89,
                'active_sell_offers' => 56,
                'active_buy_offers' => 33,
                'total_volume' => 125000000,
                'average_price' => 7500000
            ];

            return response()->json([
                'success' => true,
                'nfts' => ['data' => $nfts],
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch marketplace NFTs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ユーザーのNFT一覧を取得
     */
    public function getMyNFTs(Request $request)
    {
        $user = $request->user();

        try {
            // デモ用：ユーザーが所有するNFT
            $nfts = [
                [
                    'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE202',
                    'metadata' => [
                        'name' => 'My Crypto Kitty #142',
                        'description' => 'My adorable digital cat',
                        'image' => 'https://picsum.photos/400/400?random=2',
                        'attributes' => [
                            ['trait_type' => 'Eyes', 'value' => 'Green'],
                            ['trait_type' => 'Fur', 'value' => 'Striped']
                        ]
                    ],
                    'owner_address' => $user->wallet_address,
                    'created_at' => '2025-01-14T15:30:00Z'
                ]
            ];

            return response()->json([
                'success' => true,
                'nfts' => ['data' => $nfts],
                'total_value' => $this->calculateTotalValue($nfts)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch my NFTs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * アカウント情報を取得
     */
    public function getAccountInfo($address)
    {
        try {
            $accountInfo = $this->xrplService->getAccountInfo($address);

            return response()->json([
                'success' => true,
                'account_info' => $accountInfo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get account info: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * マーケットプレイス統計情報を取得
     */
    public function getMarketplaceStats(Request $request)
    {
        try {
            $stats = [
                'total_nfts' => 1247,
                'total_offers' => 89,
                'active_sell_offers' => 56,
                'active_buy_offers' => 33,
                'total_volume' => 125000000,
                'average_price' => 7500000,
                'recent_sales' => [
                    [
                        'nft_token_id' => '000B013A95F14B0044F78A264E41713C64B5F89242540EE201',
                        'price' => 5000000,
                        'sold_at' => '2025-01-15T10:00:00Z'
                    ]
                ],
                'top_creators' => [
                    [
                        'issuer_address' => 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH',
                        'nft_count' => 15
                    ]
                ]
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get marketplace stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * ユーザーの秘密鍵を安全に取得（実装例）
     */
    private function getUserSecret($walletAddress)
    {
        // セキュリティ上の理由で、実際の秘密鍵は返さず、
        // トランザクション署名のみを行うサービスを使用することを推奨

        // デモ用の固定値（本番環境では絶対に使用しない）
        return 'sEd7jHXXXXXXXXXXXXXXXXXXXXXXXXXX';
    }

    /**
     * NFTの総価値を計算
     */
    private function calculateTotalValue($nfts)
    {
        $totalValue = 0;

        foreach ($nfts as $nft) {
            if (isset($nft['lowest_price'])) {
                $totalValue += $nft['lowest_price'];
            }
        }

        return $totalValue;
    }
}

