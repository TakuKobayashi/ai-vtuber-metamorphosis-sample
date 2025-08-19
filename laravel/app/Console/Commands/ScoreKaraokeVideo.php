<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Google\Cloud\AIPlatform\V1\Client\VertexAI\PredictionServiceClient;
use Google\Cloud\AIPlatform\V1\EndpointName;
use Google\Cloud\AIPlatform\V1\GenerateContentRequest;
use Google\Cloud\AIPlatform\V1\Content;
use Google\Cloud\AIPlatform\V1\Part;
use Google\Protobuf\Value;

class ScoreKaraokeVideo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'karaoke:score {filePath : The path to the video or audio file.} {--songName= : The name of the song.} {--artistName= : The original artist of the song.}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scores a karaoke video or audio file using Gemini API.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $filePath = $this->argument('filePath');
        $songName = $this->option('songName');
        $artistName = $this->option('artistName');

        if (!file_exists($filePath)) {
            $this->error("File not found at: {$filePath}");
            return 1;
        }

        $this->info("Analyzing karaoke performance from: {$filePath}");
        $this->info("Song: {$songName} / Artist: {$artistName}");
        $this->line('Please wait, this may take a few minutes...');

        try {
            // ファイルのMIMEタイプを取得
            $mimeType = mime_content_type($filePath);
            if ($mimeType === false) {
                $this->error('Could not determine the MIME type of the file.');
                return 1;
            }

            // ファイルをbase64にエンコード
            $fileData = base64_encode(file_get_contents($filePath));

            // Vertex AI クライアントの初期化
            $projectId = config('services.google.project_id', env('GOOGLE_CLOUD_PROJECT_ID'));
            $location = config('services.google.location', env('GOOGLE_CLOUD_LOCATION'));
            $modelId = 'gemini-1.5-pro-preview-0815'; // 最新のモデルを確認してください

            $client = new PredictionServiceClient([
                'apiEndpoint' => "{$location}-aiplatform.googleapis.com",
            ]);

            $endpoint = EndpointName::format([
                'project' => $projectId,
                'location' => $location,
                'publisher' => 'google',
                'model' => $modelId,
            ]);

            // プロンプトの作成
            $prompt = $this->createPrompt($songName, $artistName);

            // リクエストボディの作成
            $videoPart = new Part([
                'inline_data' => new Value([
                    'string_value' => $fileData,
                ]),
                'mime_type' => $mimeType,
            ]);

            $textPart = new Part([
                'text' => $prompt,
            ]);

            $contents = [new Content(['parts' => [$videoPart, $textPart]])];

            $request = new GenerateContentRequest([
                'model' => $endpoint,
                'contents' => $contents,
            ]);

            // APIリクエストの実行
            $response = $client->generateContent($request);
            $resultText = $response->getCandidates()[0]->getContent()->getParts()[0]->getText();

            $this->info("\n--- Scoring Result ---");
            $this->line($resultText);
            $this->info("--- End of Result ---");

        } catch (\Exception $e) {
            $this->error("An error occurred: " . $e->getMessage());
            return 1;
        } finally {
            if (isset($client)) {
                $client->close();
            }
        }

        return 0;
    }

    /**
     * Create a detailed prompt for scoring.
     *
     * @param string|null $songName
     * @param string|null $artistName
     * @return string
     */
    private function createPrompt(?string $songName, ?string $artistName): string
    {
        $prompt = "あなたはプロのボーカルトレーナーです。提供された動画（または音声）ファイルに含まれる歌声を、以下の観点から厳格に評価し、採点してください。

# 指示
- 総合点数を100点満点で採点してください。
- 各評価項目についても100点満点で採点してください。
- 良かった点と改善点を具体的に指摘してください。
- 改善のための具体的な練習方法をアドバイスしてください。
- 全体を通して、プロのトレーナーとして温かくも的確なフィードバックを記述してください。

# 評価項目
1.  **音程 (Pitch)**: 音程が正確か。音を外している箇所はないか。
2.  **リズム (Rhythm)**: リズムが正確か。走りすぎたり、遅れたりしていないか。
3.  **声の安定性 (Stability)**: 声が震えたり、不安定になったりしていないか。ロングトーンは安定しているか。
4.  **表現力 (Expression)**: 抑揚や強弱がつけられているか。感情がこもっているか。ビブラートやしゃくりなどの歌唱テクニックは効果的に使えているか。
5.  **発声 (Vocalization)**: 声量はあるか。発音は明瞭か。喉声になっていないか。

# 曲情報
- 曲名: " . ($songName ?: '不明') . "
- オリジナルアーティスト: " . ($artistName ?: '不明') . "

# 出力形式
必ず以下のJSON形式で回答してください。

```json
{
  \"overallScore\": (総合点),
  \"scores\": {
    \"pitch\": (音程の点数),
    \"rhythm\": (リズムの点数),
    \"stability\": (声の安定性の点数),
    \"expression\": (表現力の点数),
    \"vocalization\": (発声の点数)
  },
  \"positiveFeedback\": \"(良かった点の具体的な説明)\",
  \"areasForImprovement\": \"(改善点の具体的な説明)\",
  \"advice\": \"(改善のための具体的な練習方法)\",
  \"overallComment\": \"(全体的な総評)\"
}

";
        return $prompt;
    }
}


