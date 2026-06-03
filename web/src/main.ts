/**
 * main.ts - PlayCanvas アプリケーションのエントリーポイント
 *
 * pnpm run dev → Vite が localhost:3000 で起動します。
 */

import * as pc from 'playcanvas';
import { VrmSceneScript, registerAsPlayCanvasScript } from './scripts/vrmScene.js';

// =========================================================
// PlayCanvas Application 初期化
// =========================================================

const pcCanvas = document.getElementById('application-canvas') as HTMLCanvasElement;

const app = new pc.Application(pcCanvas, {
  graphicsDeviceOptions: {
    antialias: false, // Three.js 側で antialias を管理
    alpha: true,
  },
  mouse: new pc.Mouse(pcCanvas),
  touch: 'ontouchstart' in window ? new pc.TouchDevice(pcCanvas) : undefined,
  keyboard: new pc.Keyboard(window),
});

// canvas は #canvas-wrapper の CSS (90vw × 40vw) に従う。
// PlayCanvas のフィルモードを NONE にして CSS で制御する。
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

// canvas のピクセルサイズを親ラッパーに合わせる
const wrapper = pcCanvas.parentElement as HTMLElement;
pcCanvas.width = wrapper.clientWidth;
pcCanvas.height = wrapper.clientHeight;

// PlayCanvas のデフォルト描画を最小化（Three.js が描画を担当するため）
const dummyCamera = new pc.Entity('DummyCamera');
dummyCamera.addComponent('camera', {
  clearColor: new pc.Color(0, 0, 0, 0),
  farClip: 0.001,
});
app.root.addChild(dummyCamera);

// PlayCanvas Editor 向けに createScript 登録
registerAsPlayCanvasScript(pc);

// =========================================================
// VrmSceneScript 初期化
// =========================================================

const vrmScene = new VrmSceneScript(app, pcCanvas, {
  modelsInfoUrl: '/threedmodels/models-info.json',
  cameraFov: 50,
  cameraPosY: 1.5,
  cameraPosZ: -2.5,
});

// =========================================================
// PlayCanvas メインループに update をフック
// =========================================================

app.on('update', (dt: number) => {
  vrmScene.update(dt);
});

// =========================================================
// アプリケーション開始 & 初期アセットロード
// =========================================================

app.start();

vrmScene.loadInitAssets().catch((err: unknown) => {
  console.error('初期アセットのロードに失敗しました:', err);
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.textContent =
      'ロードに失敗しました: ' + (err instanceof Error ? err.message : String(err));
  }
});

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
  const nw = wrapper.clientWidth;
  const nh = wrapper.clientHeight;
  pcCanvas.width = nw;
  pcCanvas.height = nh;
});
