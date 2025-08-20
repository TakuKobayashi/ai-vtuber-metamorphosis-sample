<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use QwenClient;
use Illuminate\Support\Facades\Http;

class QwenController extends Controller
{

    public function index(Request $request)
    {
        // Validate request
//        $request->validate([
//            'video' => 'required|file|mimetypes:video/mp4,video/avi,video/mpeg,video/quicktime|max:100000',
//        ]);

        $apiKey = '';
//        $baseUrl = config('qwen.api_base_url', 'https://dashscope-intl.aliyuncs.com/api/v1');


        try {

            // Read video as binary data
//          $videoData = file_get_contents("/var/www/utaone/laravel/storage/app/public/recordings/3_3_1745730186.webm");
//            $videoData = file_get_contents("/var/www/utaone/laravel/storage/app/public/recordings/uta.mp4");
            $videoUrl = "https://uta.one/storage/recordings/3_3_1745730186.webm";
//            $videoUrl = "https://uta.one/storage/recordings/uta.mp4";
            // Encode to base64
            //           $base64Video = base64_encode($videoData);

            // Get file extension
//            $mimeType = "video/webm";
//            $mimeType = "video/mp4";
            // 正しいエンドポイント
//            $endpoint = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

            // URLの検証
//            $request->validate([
//                'video_url' => 'required|url',
//            ]);

            // ビデオURLを取得
//                $videoUrl = $request->input('video_url');

            // 設定からAPIキーを取得
//                $apiKey = config('qwen.api_key');

            // 正しいエンドポイント
            $endpoint = 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

            // DashScope APIの正しい形式でペイロードを構築
            $payload = [
                'model' => 'qwen-vl-max',
                'input' => [
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => [
                                ['text' => 'You are a helpful assistant.']
                            ]
                        ],
                        [
                            'role' => 'user',
                            'content' => [
                                // 直接URLを使用
                                ['video' => $videoUrl],
                                ['text' => 'このビデオを分析して、その内容を詳細に説明してください。']
                            ]
                        ]
                    ]
                ]

            ];

            // 直接APIリクエストを送信
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(120)->post($endpoint, $payload);

            // レスポンスをログに記録（デバッグ用）
            Log::info('API Response Status: ' . $response->status());
            Log::info('API Response Body: ' . $response->body());

            // リクエストが成功したかチェック
            if ($response->successful()) {
                // APIレスポンスを返す
                return response()->json([
                    'success' => true,
                    'analysis' => $response->json(),
                ]);
            } else {
                // エラーをログに記録
                Log::error('API Error: ' . $response->body());

                // エラーを返す
                return response()->json([
                    'success' => false,
                    'message' => 'ビデオの分析に失敗しました',
                    'error' => $response->json(),
                ], 500);
            }

        } catch (\Exception $e) {
            // 例外をログに記録
            Log::error('分析エラー: ' . $e->getMessage());

            // エラーレスポンスを返す
            return response()->json([
                'success' => false,
                'message' => 'ビデオ分析中にエラーが発生しました',
                'error' => $e->getMessage(),
            ], 500);
        }


    }


    /**
     * Process and analyze a video using Alibaba Qwen 2.5 LV API
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function analyzeVideo(Request $request)
    {
        // Validate request
        $request->validate([
            'video' => 'required|file|mimetypes:video/mp4,video/avi,video/mpeg,video/quicktime|max:100000',
        ]);

        try {
            // Get the video file
            $videoFile = $request->file('video');

            // Read video as binary data
            $videoData = file_get_contents($videoFile->getPathname());

            // Encode to base64
            $base64Video = base64_encode($videoData);

            // Get file extension
            $fileExtension = $videoFile->getClientOriginalExtension();

            // Initialize QwenClient
            $qwen = app(QwenClient::class);

            // Create content array with video data
            $content = [
                [
                    'type' => 'text',
                    'text' => 'Analyze this video and describe its content in detail.'
                ],
                [
                    'type' => 'video',
                    'video' => [
                        'format' => $fileExtension,
                        'data' => $base64Video
                    ]
                ]
            ];

            // Send to Qwen 2.5 LV API
            $response = $qwen
                ->withModel('qwen-2.5-lv')  // Use Qwen 2.5 LV model
                ->withContent($content)     // Set custom content with video
                ->run();

            // Return the response
            return response()->json([
                'success' => true,
                'analysis' => $response,
            ]);

        } catch (\Exception $e) {
            // Log the exception
            Log::error('Qwen Video Analysis Error: ' . $e->getMessage());

            // Return error response
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during video analysis',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
