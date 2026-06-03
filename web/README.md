# PlayCanvas VRM Viewer

VRM キャラクターに VRMA アニメーションをランタイムで差し替えられるビューアです。

**フレームワーク構成:**
- **Next.js (App Router)** — UI / ページ構成
- **React + MUI** — アニメーション切り替えボタン等の UI コンポーネント
- **PlayCanvas Engine** — メインループ管理・スクリプトコンポーネントシステム
- **Three.js + @pixiv/three-vrm** — VRM / VRMA のロード・レンダリング

## 機能

- VRM キャラクターの表示
- VRMA アニメーションのランタイム差し替え（ボタンで切り替え）
- ランダムステージ (GLB) の読み込み
- 自動瞬き / カメラ視線追従 / リップシンク対応
- OrbitControls によるカメラ操作（ドラッグ・ズーム）

## ローカル開発

### 必要環境

- Node.js 18 以上
- pnpm

### セットアップ

```bash
pnpm install
```

### 開発サーバー起動

```bash
pnpm run dev
```

`http://localhost:3000` をブラウザで開いてください。

### ビルド

```bash
pnpm run build
pnpm run start
```

### 型チェック

```bash
pnpm run typecheck
```

---

## プロジェクト構成

```
playcanvas-vrm/
├── next.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── threedmodels/
│       ├── models-info.json       ← VRM / VRMA / Stage の一覧定義
│       ├── vrms/                  ← VRM キャラクターモデル
│       ├── vrmas/                 ← VRMA アニメーションファイル
│       └── stages/                ← GLB ステージモデル
└── src/
    └── app/
        ├── layout.tsx
        ├── page.tsx               ← メインページ（MUI Grid + Button でアニメーション切り替えUI）
        ├── globals.css
        ├── page.module.css
        └── components/
            ├── PlayCanvasScene.tsx      ← PlayCanvas + Three.js をラップした React クラスコンポーネント
            ├── vrmScene.ts              ← VRM / VRMA / GLB のロード・アニメーション管理
            ├── types.ts                 ← models-info.json の型定義
            ├── emoteController/
            │   ├── emoteController.ts
            │   ├── expressionController.ts
            │   ├── autoBlink.ts
            │   └── autoLookAt.ts
            └── lipSync/
                └── lipSync.ts
```

## アーキテクチャ

```
Next.js Page (page.tsx)
  └─ <PlayCanvasScene ref={...} />        ← React クラスコンポーネント
       ├─ PlayCanvas Application           ← メインループ管理
       │    └─ app.on('update', dt => vrmScene.update(dt))
       └─ VrmScene                         ← Three.js + @pixiv/three-vrm
            ├─ THREE.WebGLRenderer (canvas を div に append)
            ├─ VRMLoaderPlugin             ← VRM 読み込み
            ├─ VRMAnimationLoaderPlugin    ← VRMA 読み込み・差し替え
            └─ EmoteController
                 ├─ ExpressionController
                 ├─ AutoBlink
                 └─ AutoLookAt
```

### なぜ PlayCanvas + Three.js のハイブリッド構成か

`@pixiv/three-vrm` は Three.js の `Object3D` を直接操作するため、PlayCanvas ネイティブのシーングラフへの完全移植は困難です。そのため:

- **PlayCanvas** → アプリのライフサイクル・メインループ管理
- **Three.js** → VRM / VRMA のレンダリング（PlayCanvas canvas に重ねた canvas で描画）

という役割分担にしています。

## models-info.json の構成

```json
{
  "stages": [
    { "name": "ステージ名", "pathes": ["/threedmodels/stages/xxx.glb"] }
  ],
  "vrms": [
    { "name": "キャラクター名", "path": "/threedmodels/vrms/xxx.vrm" }
  ],
  "animations": [
    {
      "name": "内部名",
      "displayName": "ボタン表示名",
      "path": "/threedmodels/vrmas/xxx/xxx.vrma"
    }
  ]
}
```

新しい VRM・VRMA・ステージを追加する場合はこの JSON にエントリを追加してください。

## PlayCanvas Editor での利用

PlayCanvas Editor で編集可能にする場合は、`VrmScene` クラス (`src/app/components/vrmScene.ts`) を
`pc.createScript` 形式に変換してアップロードしてください。詳細は各ファイルのコメントを参照。
