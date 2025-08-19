<?php
namespace App\Services;

use Illuminate\Support\Facades\Http;
use Exception;

class Veo3ApiService
{
    protected $baseUrl;
    protected $apiKey;

    public function __construct()
    {
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        $this->apiKey = config('services.gemini.api_key');
    }

    /**
     * Gemini APIを通じてVeo 3で動画を生成
     *
     * @param string $imagePath ローカルの画像ファイルパス
     * @param string $prompt 動画生成のプロンプト
     * @param array $options 動画生成のオプション
     * @return array|null
     */
    public function createVideoFromImage(string $imagePath, string $prompt, array $options = [])
    {
        try {
            // 画像ファイルをBase64形式にエンコード
            $imageData = base64_encode(file_get_contents($imagePath));

            // リクエストボディを構築
            $requestBody = [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'text' => $prompt,
                                'video_generation_options' => $options,
                            ],
                            [
                                'inline_data' => [
                                    'mime_type' => 'image/jpeg', // ファイルタイプは画像に合わせて変更
                                    'data' => $imageData,
                                ]
                            ]
                        ]
                    ]
                ]
            ];

            // Gemini APIにリクエストを送信
            $response = Http::post("{$this->baseUrl}/models/veo3-preview:generateContent?key={$this->apiKey}", $requestBody);

            if ($response->successful()) {
                // 成功レスポンスを返す
                return $response->json();
            } else {
                throw new Exception("APIリクエストが失敗しました: " . $response->body());
            }

        } catch (Exception $e) {
            \Log::error($e->getMessage());
            return null;
        }
    }
}


