# PlayCanvas VRM Viewer

VRM キャラクターに VRMA アニメーションをランタイムで差し替えられるビューアです。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| UI フレームワーク | Next.js 16 (App Router) + React 19 |
| UI コンポーネント | MUI (Material UI) v9 |
| メインループ | PlayCanvas Engine v2 |
| 3D レンダリング | Three.js + @pixiv/three-vrm / three-vrm-animation |
| スタイリング | CSS Modules |
| フォーマッター | Prettier |

---

## ローカル開発

```bash
pnpm install
pnpm run dev
# → http://localhost:3000
```

### その他のコマンド

```bash
pnpm run build       # プロダクションビルド (next build)
pnpm run start       # ビルド済みを起動
pnpm run typecheck   # 型チェックのみ
pnpm run format      # Prettier でコード整形
```

---

## Cloudflare Workers へのデプロイ

`next.config.ts` に `output: 'export'` が設定されており、静的エクスポートが有効です。

```bash
# 1. 静的ファイルをビルド
pnpm run build

# 2. Wrangler でデプロイ (wrangler.jsonc を適宜設定)
npx wrangler pages deploy out/
```

> **注意**: 動的APIルートは使用していないため、静的エクスポートで完全に動作します。

---

## プロジェクト構成

```
web/
├── next.config.ts
├── tsconfig.json
├── package.json
├── .prettierrc
├── public/
│   └── threedmodels/
│       ├── models-info.json   ← VRM / VRMA / Stage の一覧定義
│       ├── vrms/              ← VRM キャラクターモデル
│       ├── vrmas/             ← VRMA アニメーションファイル
│       └── stages/            ← GLB ステージモデル
└── src/
    └── app/
        ├── layout.tsx
        ├── page.tsx                          ← メインページ (VRM・アニメーション切り替え UI)
        ├── globals.css
        ├── page.module.css
        └── components/
            ├── MuiThemeProvider.tsx          ← MUI ダークテーマ Provider
            ├── PlayCanvasScene.tsx           ← PlayCanvas + Three.js をラップした React コンポーネント
            ├── vrmScene.ts                   ← VRM / VRMA / GLB のロード・アニメーション管理
            ├── three-scene.tsx               ← 旧 Three.js のみの実装 (参照用)
            ├── types.ts                      ← models-info.json の型定義
            ├── emoteController/
            │   ├── emoteController.ts
            │   ├── expressionController.ts
            │   ├── autoBlink.ts
            │   └── autoLookAt.ts
            └── lipSync/
                └── lipSync.ts
```

---

## アーキテクチャ

```
Next.js Page (page.tsx)
  └─ <PlayCanvasScene ref={...} />
       ├─ PlayCanvas Application        ← app.on('update', dt => vrmScene.update(dt))
       └─ VrmScene (vrmScene.ts)
            ├─ THREE.WebGLRenderer      ← PlayCanvas canvas に重ねた canvas で描画
            ├─ VRMLoaderPlugin          ← VRM 読み込み
            ├─ VRMLookAtQuaternionProxy ← 視線追従プロキシ (警告抑制のため手動生成)
            ├─ VRMAnimationLoaderPlugin ← VRMA 読み込み・差し替え
            └─ EmoteController
                 ├─ ExpressionController
                 ├─ AutoBlink
                 └─ AutoLookAt
```

### よくある質問

**Q: `src/scripts/` ディレクトリは？**

以前の Vite 版開発時に存在したディレクトリで、現在は不要です。
現在のビルドシステムは Next.js であり、`src/scripts/` は使用していません。
誤って残っている場合はビルドエラーの原因になるため削除してください。

**Q: `createVRMAnimationClip: VRMLookAtQuaternionProxy is not found` の警告は？**

`vrmScene.ts` の `updateVrmArrayBuffer` 内で `VRMLookAtQuaternionProxy` を手動生成しているため、
現在のコードでは**この警告は出ません**。
もし表示される場合は `vrmScene.ts` の VRM ロード処理を確認してください。

---

## PlayCanvas Editor での利用

PlayCanvas Editor 上でこのプロジェクトのロジックを編集・拡張する手順です。

### 前提

- [PlayCanvas](https://playcanvas.com/) のアカウントが必要です
- Editor は `https://playcanvas.com/editor` からアクセスします

### 手順

#### 1. 新規プロジェクトを作成

PlayCanvas Dashboard で **New Project** → Blank テンプレートを選択します。

#### 2. 3D モデルアセットをアップロード

`public/threedmodels/` 以下のファイルを Editor の **Assets パネル**にアップロードします。

```
threedmodels/
├── models-info.json
├── vrms/          ← .vrm ファイル
├── vrmas/         ← .vrma ファイル
└── stages/        ← .glb ファイル
```

#### 3. External Scripts を追加

Editor の **Settings（歯車アイコン）→ External Scripts** に以下の CDN URL を**順番通りに**追加します。

```
https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js
https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/loaders/GLTFLoader.js
https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/controls/OrbitControls.js
https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.3/lib/three-vrm.module.js
https://cdn.jsdelivr.net/npm/@pixiv/three-vrm-animation@3.5.3/lib/three-vrm-animation.module.js
```

#### 4. カスタムスクリプトを作成

Editor の **Assets → Scripts** フォルダに新規スクリプトを作成し、
以下のコードを貼り付けます（`vrmScene.ts` のロジックを `pc.createScript` 形式に変換したもの）。

```javascript
/* global pc, THREE, GLTFLoader, OrbitControls,
   VRMLoaderPlugin, VRMAnimationLoaderPlugin,
   VRMLookAtQuaternionProxy, createVRMAnimationClip */

var VrmScene = pc.createScript('vrmScene');

VrmScene.attributes.add('modelsInfoUrl', {
  type: 'string',
  default: '/threedmodels/models-info.json',
  title: 'Models Info JSON URL',
});
VrmScene.attributes.add('cameraFov',  { type: 'number', default: 50,   title: 'Camera FOV' });
VrmScene.attributes.add('cameraPosY', { type: 'number', default: 1.5,  title: 'Camera Y' });
VrmScene.attributes.add('cameraPosZ', { type: 'number', default: -2.5, title: 'Camera Z' });

VrmScene.prototype.initialize = function () {
  var canvas = this.app.graphicsDevice.canvas;
  var wrapper = canvas.parentElement;
  var w = wrapper.clientWidth, h = wrapper.clientHeight;

  // Three.js canvas を PlayCanvas canvas に重ねる
  var threeCanvas = document.createElement('canvas');
  threeCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
  wrapper.appendChild(threeCanvas);

  var renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(window.devicePixelRatio);
  this._renderer = renderer;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x212121);
  scene.add(new THREE.AmbientLight(0xffffff));
  var dir = new THREE.DirectionalLight(0xffffff);
  dir.position.set(0, 1, -2);
  scene.add(dir);
  this._scene = scene;

  var camera = new THREE.PerspectiveCamera(this.cameraFov, w / h, 0.01);
  camera.position.set(0, this.cameraPosY, this.cameraPosZ);
  this._camera = camera;

  var controls = new OrbitControls(camera, threeCanvas);
  controls.target.set(0, 1.125, 0);
  controls.update();
  this._controls = controls;

  this._vrm = null;
  this._mixer = null;
  this._lastVrmaBuffer = null;

  window.addEventListener('resize', function () {
    var nw = wrapper.clientWidth, nh = wrapper.clientHeight;
    renderer.setSize(nw, nh, false);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
  });

  this._loadInitAssets();
};

VrmScene.prototype._loadInitAssets = async function () {
  var res = await fetch(this.modelsInfoUrl);
  var info = await res.json();

  var vrmBuf = await (await fetch(info.vrms[0].path)).arrayBuffer();
  await this._loadVrm(vrmBuf);

  var vrmaBuf = await (await fetch(info.animations[0].path)).arrayBuffer();
  await this._loadVrma(vrmaBuf);

  var si = Math.floor(Math.random() * info.stages.length);
  for (var path of info.stages[si].pathes) {
    var buf = await (await fetch(path)).arrayBuffer();
    var loader = new GLTFLoader();
    var gltf = await loader.parseAsync(buf, '');
    this._scene.add(gltf.scene);
  }
};

VrmScene.prototype._loadVrm = async function (arrayBuffer) {
  if (this._vrm) this._scene.remove(this._vrm.scene);
  var loader = new GLTFLoader();
  loader.register(function (p) { return new VRMLoaderPlugin(p); });
  var gltf = await loader.parseAsync(arrayBuffer, '');
  var vrm = gltf.userData.vrm;
  if (vrm.lookAt) {
    var proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
    proxy.name = 'VRMLookAtQuaternionProxy';
    vrm.scene.add(proxy);
  }
  this._scene.add(vrm.scene);
  this._vrm = vrm;
  this._mixer = new THREE.AnimationMixer(vrm.scene);
  // VRM 差し替え後に前のアニメーションを自動再生
  if (this._lastVrmaBuffer) await this._loadVrma(this._lastVrmaBuffer);
};

VrmScene.prototype._loadVrma = async function (arrayBuffer) {
  this._lastVrmaBuffer = arrayBuffer;
  var loader = new GLTFLoader();
  loader.register(function (p) { return new VRMAnimationLoaderPlugin(p); });
  var gltf = await loader.parseAsync(arrayBuffer, '');
  var anims = gltf.userData.vrmAnimations;
  if (this._vrm && this._mixer && anims) {
    this._mixer.stopAllAction();
    for (var anim of anims) {
      var clip = createVRMAnimationClip(anim, this._vrm);
      this._mixer.clipAction(clip).play();
    }
  }
};

VrmScene.prototype.update = function (dt) {
  if (this._mixer) this._mixer.update(dt);
  if (this._vrm) this._vrm.update(dt);
  if (this._controls) this._controls.update();
  if (this._renderer) this._renderer.render(this._scene, this._camera);
};
```

#### 5. エンティティにアタッチ

1. シーン内に空の **Entity** を作成（名前例: `VrmController`）
2. **Script コンポーネント**を追加
3. スクリプト一覧から `vrmScene` を選んでアタッチ
4. Attribute を設定:

| Attribute | デフォルト値 | 説明 |
|---|---|---|
| Models Info Url | `/threedmodels/models-info.json` | モデル一覧 JSON のパス |
| Camera Fov | `50` | カメラ視野角 |
| Camera Pos Y | `1.5` | カメラ Y 座標 |
| Camera Pos Z | `-2.5` | カメラ Z 座標 |

#### 6. Launch で動作確認

Editor 上部の **Launch** ボタンをクリックして確認します。
VRM とステージが読み込まれ、OrbitControls でカメラを操作できれば成功です。

---

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
      "name": "内部キー名",
      "displayName": "UI 表示名",
      "path": "/threedmodels/vrmas/xxx/xxx.vrma"
    }
  ]
}
```

新しい VRM・VRMA・ステージを追加する場合はこの JSON にエントリを追加するだけです。
