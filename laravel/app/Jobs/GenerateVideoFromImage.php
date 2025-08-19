<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\Veo3ApiService;

class GenerateVideoFromImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $imagePath;
    protected $prompt;
    protected $options;

    /**
     * 新しいジョブインスタンスを作成
     *
     * @param string $imagePath
     * @param string $prompt
     * @param array $options
     */
    public function __construct(string $imagePath, string $prompt, array $options)
    {
        $this->imagePath = $imagePath;
        $this->prompt = $prompt;
        $this->options = $options;
    }

    /**
     * ジョブを実行
     *
     * @return void
     */
    public function handle(Veo3ApiService $veo3Service)
    {
        // Veo3ApiServiceを使って動画生成リクエストを送信
        $response = $veo3Service->createVideoFromImage($this->imagePath, $this->prompt, $this->options);

        if ($response) {
            // 動画生成が成功した場合の処理
            \Log::info("動画生成リクエストが成功しました。レスポンス: " . json_encode($response));
        } else {
            \Log::error("動画生成リクエストが失敗しました。");
        }
    }
}

