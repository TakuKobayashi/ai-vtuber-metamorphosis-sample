<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\GenerateVideoFromImage;
use Illuminate\Support\Facades\Storage;

class GenerateVideoCommand extends Command
{
    protected $signature = 'video:generate {image_path}';
    protected $description = '指定された画像から動画を生成します。';

    public function handle()
    {
        $imagePath = $this->argument('image_path');

        if (!Storage::disk('public')->exists($imagePath)) {
            $this->error("指定された画像ファイルが public ディスクに存在しません。");
            return 1;
        }

        $this->info("動画生成ジョブをキューに追加します...");

        // オプションを定義
        $prompt = "この画像を利用し、歌ってる様子を書き出してください。。";
        $options = [
            'duration_seconds' => 16, // 最大16秒まで
            'soundtrack_options' => [
                'type' => 'instrumental'
            ]
        ];

        // ジョブをキューにディスパッチ
        GenerateVideoFromImage::dispatch(Storage::disk('public')->path($imagePath), $prompt, $options);

        $this->info("動画生成ジョブが正常にキューに追加されました。");
        return 0;
    }
}
