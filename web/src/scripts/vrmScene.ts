/**
 * vrmScene.ts - VRM シーン管理クラス（Vite/ESM 環境用）
 *
 * PlayCanvas Engine のライフサイクルに接続しつつ、
 * Three.js + @pixiv/three-vrm で VRM/VRMA を処理する。
 *
 * ── PlayCanvas Editor での利用 ──
 * src/scripts/vrm-playcanvas-editor.js (IIFE版) を Editor にアップロードしてください。
 * 詳細は README.md を参照。
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import type * as pc from 'playcanvas';
import { EmoteController } from './emoteController.js';
import { LipSync } from './lipSync.js';
import type { AnimationInfo, ModelsInfo } from './types.js';

// -------------------------------------------------------
// UI ヘルパー
// -------------------------------------------------------

function buildAnimationButtons(animations: AnimationInfo[], onSelect: (anim: AnimationInfo) => Promise<void>): void {
  const container = document.getElementById('animation-buttons');
  if (!container) return;
  container.innerHTML = '';

  animations.forEach((anim, idx) => {
    const btn = document.createElement('button');
    btn.className = 'anim-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = anim.displayName;
    btn.addEventListener('click', async () => {
      container.querySelectorAll('.anim-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await onSelect(anim);
    });
    container.appendChild(btn);
  });
}

// -------------------------------------------------------
// VrmSceneScript
// -------------------------------------------------------

export interface VrmSceneOptions {
  modelsInfoUrl?: string;
  cameraFov?: number;
  cameraPosY?: number;
  cameraPosZ?: number;
}

export class VrmSceneScript {
  private _threeCanvas: HTMLCanvasElement | null = null; // Three.js canvas への参照（リサイズ対応などで保持）
  private threeScene: THREE.Scene | null = null;
  private threeCamera: THREE.PerspectiveCamera | null = null;
  private threeRenderer: THREE.WebGLRenderer | null = null;
  private orbitControls: OrbitControls | null = null;

  private currentVrm: VRM | null = null;
  private currentAnimationMixer: THREE.AnimationMixer | null = null;
  private currentAnimationClipActions: THREE.AnimationAction[] = [];

  private lipSync: LipSync | null = null;
  public emoteController: EmoteController | null = null;

  // 設定値
  private readonly modelsInfoUrl: string;
  private readonly cameraFov: number;
  private readonly cameraPosY: number;
  private readonly cameraPosZ: number;

  constructor(_app: pc.AppBase, canvas: HTMLCanvasElement, options: VrmSceneOptions = {}) {
    this.modelsInfoUrl = options.modelsInfoUrl ?? '/threedmodels/models-info.json';
    this.cameraFov = options.cameraFov ?? 50;
    this.cameraPosY = options.cameraPosY ?? 1.5;
    this.cameraPosZ = options.cameraPosZ ?? -2.5;

    this.initThreeScene(canvas);
    this.lipSync = new LipSync(new AudioContext());
  }

  /** 毎フレーム呼び出す（PlayCanvas の update フックから呼ぶ） */
  update(dt: number): void {
    if (this.lipSync) {
      const { volume } = this.lipSync.update();
      this.emoteController?.lipSync('aa', volume);
    }

    this.emoteController?.update(dt);
    this.currentAnimationMixer?.update(dt);
    this.currentVrm?.update(dt);
    this.orbitControls?.update();

    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  /** 初期リソースを一括ロード */
  async loadInitAssets(): Promise<void> {
    const response = await fetch(this.modelsInfoUrl);
    const modelInfos: ModelsInfo = await response.json();

    buildAnimationButtons(modelInfos.animations, async (anim) => {
      const res = await fetch(anim.path);
      const buf = await res.arrayBuffer();
      await this.updateVrmAnimationArrayBuffer(buf);
    });

    // VRM ロード
    const vrmRes = await fetch(modelInfos.vrms[0].path);
    await this.updateVrmArrayBuffer(await vrmRes.arrayBuffer());

    if (this.currentVrm && this.threeCamera) {
      this.emoteController = new EmoteController(this.currentVrm, this.threeCamera);
    }

    // 初期アニメーション
    const vrmaRes = await fetch(modelInfos.animations[0].path);
    await this.updateVrmAnimationArrayBuffer(await vrmaRes.arrayBuffer());

    // ランダムステージ
    const stageIndex = Math.floor(Math.random() * modelInfos.stages.length);
    await Promise.all(
      modelInfos.stages[stageIndex].pathes.map(async (path) => {
        const res = await fetch(path);
        return this.updateGlbArrayBuffer(await res.arrayBuffer());
      }),
    );

    // ローディングオーバーレイを非表示にする
    // ボタン群は最初から DOM にあるため操作不要
    const loadingEl = document.getElementById('loading-screen');
    if (loadingEl) loadingEl.classList.add('hidden');
  }

  // -------------------------------------------------------
  // VRM / VRMA / GLB ロードメソッド
  // -------------------------------------------------------

  async updateVrmArrayBuffer(arrayBuffer: ArrayBuffer): Promise<VRM> {
    if (this.currentVrm && this.threeScene) {
      this.threeScene.remove(this.currentVrm.scene);
      this.currentVrm = null;
      this.currentAnimationMixer = null;
      this.currentAnimationClipActions = [];
    }

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrm = gltf.userData.vrm as VRM;

    this.threeScene?.add(vrm.scene);
    this.currentVrm = vrm;
    this.currentAnimationMixer = new THREE.AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateVrmUrl(url: string): Promise<VRM> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;

    if (this.currentVrm && this.threeScene) {
      this.threeScene.remove(this.currentVrm.scene);
    }
    this.threeScene?.add(vrm.scene);
    this.currentVrm = vrm;
    this.currentAnimationMixer = new THREE.AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateGlbArrayBuffer(arrayBuffer: ArrayBuffer): Promise<GLTF> {
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(arrayBuffer, '');
    this.threeScene?.add(gltf.scene);
    return gltf;
  }

  async updateVrmAnimationArrayBuffer(arrayBuffer: ArrayBuffer): Promise<GLTF> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrmAnimations = gltf.userData.vrmAnimations as Parameters<typeof createVRMAnimationClip>[0][];

    if (this.currentVrm && this.currentAnimationMixer && vrmAnimations) {
      this.currentAnimationMixer.stopAllAction();
      this.currentAnimationClipActions = [];

      for (const vrmAnimation of vrmAnimations) {
        const clip = createVRMAnimationClip(vrmAnimation, this.currentVrm);
        const action = this.currentAnimationMixer.clipAction(clip);
        this.currentAnimationClipActions.push(action);
        action.play();
      }
    }

    return gltf;
  }

  async speakVrm(buffer: ArrayBuffer, expression: string): Promise<void> {
    this.emoteController?.playEmotion(expression);
    await new Promise<void>((resolve) => {
      this.lipSync?.playFromArrayBuffer(buffer, () => resolve());
    });
  }

  // -------------------------------------------------------
  // Three.js シーン初期化
  // -------------------------------------------------------

  private initThreeScene(pcCanvas: HTMLCanvasElement): void {
    // サイズはラッパー要素（#canvas-wrapper）から取る
    const wrapper = pcCanvas.parentElement as HTMLElement;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;

    // PlayCanvas canvas に重ねる専用 Three.js canvas
    const threeCanvas = document.createElement('canvas');
    threeCanvas.id = 'three-canvas';
    wrapper.appendChild(threeCanvas);
    this._threeCanvas = threeCanvas;

    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    this.threeScene = scene;

    const ambient = new THREE.AmbientLight(0xffffff);
    ambient.position.set(0, 1, -2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 1, -2);
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLightHelper(dirLight, 2));

    const camera = new THREE.PerspectiveCamera(this.cameraFov, w / h, 0.01);
    camera.position.set(0, this.cameraPosY, this.cameraPosZ);
    this.threeCamera = camera;

    const controls = new OrbitControls(camera, threeCanvas);
    controls.target.set(0, 0.75 * 1.5, 0);
    controls.update();
    this.orbitControls = controls;

    window.addEventListener('resize', () => {
      const nw = wrapper.clientWidth;
      const nh = wrapper.clientHeight;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
  }
}

// -------------------------------------------------------
// PlayCanvas createScript 登録ファクトリ（Editor 互換用）
// -------------------------------------------------------

/**
 * PlayCanvas Editor 用スクリプト定義を登録するファクトリ関数。
 * standalone (Vite) 環境では main.ts から呼び出す。
 * Editor では vrm-playcanvas-editor.js (IIFE版) を使う。
 */
export function registerAsPlayCanvasScript(pcLib: typeof import('playcanvas')): void {
  // createScript は登録失敗時に null を返す場合がある
  const VrmScenePC = pcLib.createScript('vrmScene');
  if (!VrmScenePC) {
    console.error('[VrmScene] pc.createScript が null を返しました。');
    return;
  }

  VrmScenePC.attributes.add('modelsInfoUrl', {
    type: 'string',
    default: '/threedmodels/models-info.json',
    title: 'Models Info JSON URL',
  });
  VrmScenePC.attributes.add('cameraFov', { type: 'number', default: 50, title: 'Camera FOV' });
  VrmScenePC.attributes.add('cameraPosY', { type: 'number', default: 1.5, title: 'Camera Y' });
  VrmScenePC.attributes.add('cameraPosZ', { type: 'number', default: -2.5, title: 'Camera Z' });

  // PlayCanvas の ScriptType prototype に動的にメソッドを追加するため unknown 経由でキャスト
  type PcModule = typeof import('playcanvas');
  type VrmPCInstance = PcModule['ScriptType']['prototype'] & {
    modelsInfoUrl: string;
    cameraFov: number;
    cameraPosY: number;
    cameraPosZ: number;
    _impl: VrmSceneScript;
    initialize(): void;
    update(dt: number): void;
  };

  (VrmScenePC.prototype as unknown as VrmPCInstance).initialize = function (this: VrmPCInstance) {
    const canvas = this.app.graphicsDevice.canvas as HTMLCanvasElement;
    this._impl = new VrmSceneScript(this.app, canvas, {
      modelsInfoUrl: this.modelsInfoUrl,
      cameraFov: this.cameraFov,
      cameraPosY: this.cameraPosY,
      cameraPosZ: this.cameraPosZ,
    });
    void this._impl.loadInitAssets();
  };

  (VrmScenePC.prototype as unknown as VrmPCInstance).update = function (this: VrmPCInstance, dt: number) {
    this._impl?.update(dt);
  };
}
