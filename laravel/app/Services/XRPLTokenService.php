<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class XRPLTokenService
{
    private $client;
    private $serverUrl;
    
    public function __construct()
    {
        $this->client = new Client();
        // テストネット用URL（本番環境では wss://s1.ripple.com:443 を使用）
        $this->serverUrl = env('XRPL_SERVER_URL', 'https://s.altnet.rippletest.net:51234');
    }
    
    /**
     * アカウント情報を取得
     */
    public function getAccountInfo($address)
    {
        try {
            $response = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'account_info',
                    'params' => [
                        [
                            'account' => $address,
                            'strict' => true,
                            'ledger_index' => 'current',
                            'queue' => true
                        ]
                    ]
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error('Failed to get account info: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * トークン発行用のTrust Lineトランザクションを作成
     */
    public function createTrustLineTransaction($issuerAddress, $holderAddress, $currencyCode, $value, $holderSecret)
    {
        try {
            // 1. アカウント情報を取得してシーケンス番号を取得
            $accountInfo = $this->getAccountInfo($holderAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            // 2. Trust Lineトランザクションを作成
            $transaction = [
                'TransactionType' => 'TrustSet',
                'Account' => $holderAddress,
                'LimitAmount' => [
                    'currency' => $currencyCode,
                    'issuer' => $issuerAddress,
                    'value' => $value
                ],
                'Sequence' => $sequence,
                'Fee' => '12' // 最小手数料（drops）
            ];
            
            return $transaction;
            
        } catch (\Exception $e) {
            Log::error('Failed to create trust line transaction: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * トークンを発行（Paymentトランザクション）
     */
    public function issueToken($issuerAddress, $holderAddress, $currencyCode, $amount, $issuerSecret)
    {
        try {
            // 1. 発行者のアカウント情報を取得
            $accountInfo = $this->getAccountInfo($issuerAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            // 2. Paymentトランザクションを作成
            $transaction = [
                'TransactionType' => 'Payment',
                'Account' => $issuerAddress,
                'Destination' => $holderAddress,
                'Amount' => [
                    'currency' => $currencyCode,
                    'issuer' => $issuerAddress,
                    'value' => $amount
                ],
                'Sequence' => $sequence,
                'Fee' => '12',
                'DestinationTag' => null
            ];
            
            // 3. トランザクションに署名して送信
            $signedTx = $this->signAndSubmitTransaction($transaction, $issuerSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('Token issuance failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTを発行（NFTokenMintトランザクション）
     */
    public function mintNFT($minterAddress, $minterSecret, $options = [])
    {
        try {
            // 1. 発行者のアカウント情報を取得
            $accountInfo = $this->getAccountInfo($minterAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            // 2. NFTokenMintトランザクションを作成
            $transaction = [
                'TransactionType' => 'NFTokenMint',
                'Account' => $minterAddress,
                'Sequence' => $sequence,
                'Fee' => '12'
            ];
            
            // オプションパラメータを追加
            if (isset($options['uri'])) {
                // URIをHEXエンコード
                $transaction['URI'] = strtoupper(bin2hex($options['uri']));
            }
            
            if (isset($options['taxon'])) {
                $transaction['NFTokenTaxon'] = $options['taxon'];
            } else {
                $transaction['NFTokenTaxon'] = 0; // デフォルト値
            }
            
            // NFTの設定フラグ
            $flags = 0;
            if (isset($options['transferable']) && !$options['transferable']) {
                $flags |= 1; // tfTransferable (0x00000001) - 転送不可
            }
            if (isset($options['only_xrp']) && $options['only_xrp']) {
                $flags |= 2; // tfOnlyXRP (0x00000002) - XRPでのみ購入可能
            }
            if (isset($options['trustline']) && $options['trustline']) {
                $flags |= 4; // tfTrustLine (0x00000004) - Trust Line必要
            }
            if (isset($options['burnable']) && $options['burnable']) {
                $flags |= 8; // tfBurnable (0x00000008) - 発行者がburn可能
            }
            
            if ($flags > 0) {
                $transaction['Flags'] = $flags;
            }
            
            // 転送手数料（0-50000、単位は1/100000）
            if (isset($options['transfer_fee'])) {
                $transaction['TransferFee'] = min(50000, max(0, $options['transfer_fee']));
            }
            
            // 3. トランザクションに署名して送信
            $signedTx = $this->signAndSubmitTransaction($transaction, $minterSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('NFT minting failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTをburn（削除）
     */
    public function burnNFT($ownerAddress, $ownerSecret, $nfTokenID)
    {
        try {
            $accountInfo = $this->getAccountInfo($ownerAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            $transaction = [
                'TransactionType' => 'NFTokenBurn',
                'Account' => $ownerAddress,
                'NFTokenID' => $nfTokenID,
                'Sequence' => $sequence,
                'Fee' => '12'
            ];
            
            $signedTx = $this->signAndSubmitTransaction($transaction, $ownerSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('NFT burning failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTの売却オファーを作成
     */
    public function createSellOffer($ownerAddress, $ownerSecret, $nfTokenID, $amount, $destination = null)
    {
        try {
            $accountInfo = $this->getAccountInfo($ownerAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            $transaction = [
                'TransactionType' => 'NFTokenCreateOffer',
                'Account' => $ownerAddress,
                'NFTokenID' => $nfTokenID,
                'Amount' => $amount, // drops単位（1 XRP = 1,000,000 drops）
                'Flags' => 1, // tfSellToken (0x00000001)
                'Sequence' => $sequence,
                'Fee' => '12'
            ];
            
            // 特定の買い手を指定
            if ($destination) {
                $transaction['Destination'] = $destination;
            }
            
            $signedTx = $this->signAndSubmitTransaction($transaction, $ownerSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('NFT sell offer creation failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTの購入オファーを作成
     */
    public function createBuyOffer($buyerAddress, $buyerSecret, $nfTokenID, $amount, $owner)
    {
        try {
            $accountInfo = $this->getAccountInfo($buyerAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            $transaction = [
                'TransactionType' => 'NFTokenCreateOffer',
                'Account' => $buyerAddress,
                'NFTokenID' => $nfTokenID,
                'Amount' => $amount,
                'Owner' => $owner, // NFTの現在の所有者
                'Sequence' => $sequence,
                'Fee' => '12'
            ];
            
            $signedTx = $this->signAndSubmitTransaction($transaction, $buyerSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('NFT buy offer creation failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTオファーを受諾
     */
    public function acceptOffer($accepterAddress, $accepterSecret, $nfTokenOfferID)
    {
        try {
            $accountInfo = $this->getAccountInfo($accepterAddress);
            $sequence = $accountInfo['result']['account_data']['Sequence'];
            
            $transaction = [
                'TransactionType' => 'NFTokenAcceptOffer',
                'Account' => $accepterAddress,
                'NFTokenSellOffer' => $nfTokenOfferID, // または NFTokenBuyOffer
                'Sequence' => $sequence,
                'Fee' => '12'
            ];
            
            $signedTx = $this->signAndSubmitTransaction($transaction, $accepterSecret);
            
            return $signedTx;
            
        } catch (\Exception $e) {
            Log::error('NFT offer acceptance failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * アカウントが所有するNFTを取得
     */
    public function getAccountNFTs($address)
    {
        try {
            $response = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'account_nfts',
                    'params' => [
                        [
                            'account' => $address,
                            'ledger_index' => 'current'
                        ]
                    ]
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error('Failed to get account NFTs: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * NFTのオファー情報を取得
     */
    public function getNFTOffers($nfTokenID)
    {
        try {
            $sellOffersResponse = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'nft_sell_offers',
                    'params' => [
                        [
                            'nft_id' => $nfTokenID,
                            'ledger_index' => 'current'
                        ]
                    ]
                ]
            ]);
            
            $sellOffers = json_decode($sellOffersResponse->getBody(), true);
            
            $buyOffersResponse = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'nft_buy_offers',
                    'params' => [
                        [
                            'nft_id' => $nfTokenID,
                            'ledger_index' => 'current'
                        ]
                    ]
                ]
            ]);
            
            $buyOffers = json_decode($buyOffersResponse->getBody(), true);
            
            return [
                'sell_offers' => $sellOffers,
                'buy_offers' => $buyOffers
            ];
            
        } catch (\Exception $e) {
            Log::error('Failed to get NFT offers: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * トークンの残高を確認
     */
    public function getTokenBalance($address, $currencyCode, $issuer)
    {
        try {
            $response = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'account_lines',
                    'params' => [
                        [
                            'account' => $address,
                            'ledger_index' => 'current'
                        ]
                    ]
                ]
            ]);
            
            $result = json_decode($response->getBody(), true);
            $lines = $result['result']['lines'] ?? [];
            
            foreach ($lines as $line) {
                if ($line['currency'] === $currencyCode && $line['account'] === $issuer) {
                    return $line['balance'];
                }
            }
            
            return '0';
            
        } catch (\Exception $e) {
            Log::error('Failed to get token balance: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * トランザクションに署名して送信
     * 注意: 実際の実装では、ripple-libやxrpl.jsのようなライブラリを使用することを推奨
     */
    private function signAndSubmitTransaction($transaction, $secret)
    {
        try {
            // この部分は実際にはJavaScriptライブラリ（xrpl.js）を使用するか、
            // PHPのXRP Ledgerライブラリを使用する必要があります
            
            // 例: Node.jsスクリプトを呼び出す方法
            $transactionJson = json_encode($transaction);
            $command = "node " . base_path('scripts/sign_transaction.js') . " '" . $transactionJson . "' '" . $secret . "'";
            
            $result = shell_exec($command);
            $decodedResult = json_decode($result, true);
            
            if (!$decodedResult || !$decodedResult['success']) {
                throw new \Exception('Transaction signing failed: ' . ($decodedResult['error'] ?? 'Unknown error'));
            }
            
            return $decodedResult;
            
        } catch (\Exception $e) {
            Log::error('Transaction signing and submission failed: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * レジャー情報を取得
     */
    public function getLedgerInfo()
    {
        try {
            $response = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'ledger',
                    'params' => [
                        [
                            'ledger_index' => 'current'
                        ]
                    ]
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error('Failed to get ledger info: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * サーバー情報を取得
     */
    public function getServerInfo()
    {
        try {
            $response = $this->client->post($this->serverUrl, [
                'json' => [
                    'method' => 'server_info'
                ]
            ]);
            
            return json_decode($response->getBody(), true);
            
        } catch (\Exception $e) {
            Log::error('Failed to get server info: ' . $e->getMessage());
            throw $e;
        }
    }
}