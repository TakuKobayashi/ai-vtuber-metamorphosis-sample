/**
 * vrm-playcanvas-editor.ts
 *
 * PlayCanvas Editor にアップロードするためのスタンドアロン スクリプトです。
 * このファイルは `pnpm run build:editor` でコンパイルされ、
 * `dist/vrm-playcanvas-editor.js` として出力されます。
 *
 * ── 使い方 (PlayCanvas Editor) ──
 * 1. `pnpm run build:editor` を実行
 * 2. 生成された `dist/vrm-playcanvas-editor.js` を Editor の Assets → Scripts にアップロード
 * 3. 依存ライブラリを「Settings」→「External Scripts」に追加（順番通り）:
 *    https://cdn.jsdelivr.net/npm/three@0.176.0/build/three.module.js
 *    https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/loaders/GLTFLoader.js
 *    https://cdn.jsdelivr.net/npm/three@0.176.0/examples/jsm/controls/OrbitControls.js
 *    https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.5.3/lib/three-vrm.module.js
 *    https://cdn.jsdelivr.net/npm/@pixiv/three-vrm-animation@3.5.3/lib/three-vrm-animation.module.js
 * 4. エンティティの Script コンポーネントに「vrmScene」をアタッチ
 *
 * ── 注意 ──
 * PlayCanvas Editor はネイティブ ES module import をサポートしないため、
 * このファイルは依存ライブラリをグローバル変数から参照するIIFE形式で記述されています。
 */

/* global pc, THREE, GLTFLoader, VRMLoaderPlugin, VRMAnimationLoaderPlugin, createVRMAnimationClip, OrbitControls */

// Editor 向けグローバル型（External Scripts で読み込まれる前提）
declare const THREE: typeof import('three');
declare const GLTFLoader: new () => import('three/addons/loaders/GLTFLoader.js').GLTFLoader;
declare const OrbitControls: new (
  camera: import('three').Camera,
  domElement: HTMLElement,
) => import('three/addons/controls/OrbitControls.js').OrbitControls;
declare const VRMLoaderPlugin: typeof import('@pixiv/three-vrm').VRMLoaderPlugin;
declare const VRMAnimationLoaderPlugin: typeof import('@pixiv/three-vrm-animation').VRMAnimationLoaderPlugin;
declare const createVRMAnimationClip: typeof import('@pixiv/three-vrm-animation').createVRMAnimationClip;
declare const pc: typeof import('playcanvas');

import type { VRM } from '@pixiv/three-vrm';
import type { AnimationInfo, ModelsInfo } from './types.js';

(function () {
  'use strict';

  // ===========================================================
  // LipSync
  // ===========================================================

  const TIME_DOMAIN_DATA_LENGTH = 2048;

  class LipSync {
    private readonly audio: AudioContext;
    private readonly analyser: AnalyserNode;
    private readonly timeDomainData: Float32Array<ArrayBuffer>;

    constructor(audio: AudioContext) {
      this.audio = audio;
      this.analyser = audio.createAnalyser();
      this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH) as Float32Array<ArrayBuffer>;
    }

    update(): { volume: number } {
      this.analyser.getFloatTimeDomainData(this.timeDomainData);
      let volume = 0.0;
      for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
        volume = Math.max(volume, Math.abs(this.timeDomainData[i]));
      }
      volume = 1 / (1 + Math.exp(-45 * volume + 5));
      if (volume < 0.1) volume = 0;
      return { volume };
    }

    async playFromArrayBuffer(buffer: ArrayBuffer, onEnded?: () => void): Promise<void> {
      const audioBuffer = await this.audio.decodeAudioData(buffer);
      const bufferSource = this.audio.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(this.audio.destination);
      bufferSource.connect(this.analyser);
      bufferSource.start();
      if (onEnded) bufferSource.addEventListener('ended', onEnded);
    }
  }

  // ===========================================================
  // AutoBlink
  // ===========================================================

  const BLINK_CLOSE_MAX = 0.12;
  const BLINK_OPEN_MAX = 5;

  class AutoBlink {
    private readonly expressionManager: VRM['expressionManager'] & object;
    private remainingTime: number;
    private isOpen: boolean;
    private isAutoBlink: boolean;

    constructor(expressionManager: NonNullable<VRM['expressionManager']>) {
      this.expressionManager = expressionManager;
      this.remainingTime = 0;
      this.isAutoBlink = true;
      this.isOpen = true;
    }

    setEnable(isAuto: boolean): number {
      this.isAutoBlink = isAuto;
      if (!this.isOpen) return this.remainingTime;
      return 0;
    }

    update(delta: number): void {
      if (this.remainingTime > 0) {
        this.remainingTime -= delta;
        return;
      }
      if (this.isOpen && this.isAutoBlink) {
        this.close();
        return;
      }
      this.open();
    }

    private close(): void {
      this.isOpen = false;
      this.remainingTime = BLINK_CLOSE_MAX;
      this.expressionManager.setValue('blink', 1);
    }

    private open(): void {
      this.isOpen = true;
      this.remainingTime = BLINK_OPEN_MAX;
      this.expressionManager.setValue('blink', 0);
    }
  }

  // ===========================================================
  // AutoLookAt
  // ===========================================================

  class AutoLookAt {
    // GC されないよう保持するだけ（直接参照しない）
    private readonly lookAtTarget: import('three').Object3D;

    constructor(vrm: VRM, threeCamera: import('three').Camera) {
      this.lookAtTarget = new THREE.Object3D();
      threeCamera.add(this.lookAtTarget);
      if (vrm.lookAt) vrm.lookAt.target = this.lookAtTarget;
    }
  }

  // ===========================================================
  // ExpressionController
  // ===========================================================

  interface LipSyncState {
    preset: string;
    value: number;
  }

  class ExpressionController {
    private readonly autoLookAt: AutoLookAt;
    private autoBlink: AutoBlink | undefined;
    private expressionManager: VRM['expressionManager'];
    private currentEmotion: string;
    private currentLipSync: LipSyncState | null;

    constructor(vrm: VRM, threeCamera: import('three').Camera) {
      this.autoLookAt = new AutoLookAt(vrm, threeCamera);
      this.currentEmotion = 'neutral';
      this.currentLipSync = null;
      if (vrm.expressionManager) {
        this.expressionManager = vrm.expressionManager;
        this.autoBlink = new AutoBlink(vrm.expressionManager);
      }
    }

    playEmotion(preset: string): void {
      if (this.currentEmotion !== 'neutral') {
        this.expressionManager?.setValue(this.currentEmotion, 0);
      }
      if (preset === 'neutral') {
        this.autoBlink?.setEnable(true);
        this.currentEmotion = preset;
        return;
      }
      const t = this.autoBlink?.setEnable(false) ?? 0;
      this.currentEmotion = preset;
      setTimeout(() => {
        this.expressionManager?.setValue(preset, 1);
      }, t * 1000);
    }

    lipSync(preset: string, value: number): void {
      if (this.currentLipSync) {
        this.expressionManager?.setValue(this.currentLipSync.preset, 0);
      }
      this.currentLipSync = { preset, value };
    }

    update(delta: number): void {
      this.autoBlink?.update(delta);
      if (this.currentLipSync) {
        const weight = this.currentEmotion === 'neutral' ? this.currentLipSync.value * 0.5 : this.currentLipSync.value * 0.25;
        this.expressionManager?.setValue(this.currentLipSync.preset, weight);
      }
    }
  }

  // ===========================================================
  // EmoteController
  // ===========================================================

  class EmoteController {
    private readonly expressionController: ExpressionController;

    constructor(vrm: VRM, threeCamera: import('three').Camera) {
      this.expressionController = new ExpressionController(vrm, threeCamera);
    }

    playEmotion(preset: string): void {
      this.expressionController.playEmotion(preset);
    }
    lipSync(preset: string, value: number): void {
      this.expressionController.lipSync(preset, value);
    }
    update(delta: number): void {
      this.expressionController.update(delta);
    }
  }

  // ===========================================================
  // UI ヘルパー
  // ===========================================================

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

  // ===========================================================
  // PlayCanvas createScript 登録
  // ===========================================================

  type PcModule = typeof import('playcanvas');
  type VrmPCInstance = PcModule['ScriptType']['prototype'] & {
    modelsInfoUrl: string;
    cameraFov: number;
    cameraPosY: number;
    cameraPosZ: number;
    // --- 内部状態 ---
    _threeCanvas: HTMLCanvasElement | null;
    _threeScene: import('three').Scene | null;
    _threeCamera: import('three').PerspectiveCamera | null;
    _threeRenderer: import('three').WebGLRenderer | null;
    _orbitControls: import('three/addons/controls/OrbitControls.js').OrbitControls | null;
    _currentVrm: VRM | null;
    _currentAnimationMixer: import('three').AnimationMixer | null;
    _currentAnimationClipActions: import('three').AnimationAction[];
    _lipSync: LipSync | null;
    emoteController: EmoteController | null;
    // --- メソッド ---
    initialize(): void;
    update(dt: number): void;
    _initThreeScene(canvas: HTMLCanvasElement): void;
    _loadInitAssets(): Promise<void>;
    updateVrmArrayBuffer(buf: ArrayBuffer): Promise<VRM>;
    updateVrmUrl(url: string): Promise<VRM>;
    updateGlbArrayBuffer(buf: ArrayBuffer): Promise<void>;
    updateVrmAnimationArrayBuffer(buf: ArrayBuffer): Promise<void>;
    speakVrm(buf: ArrayBuffer, expression: string): Promise<void>;
  };

  const VrmScenePC = pc.createScript('vrmScene');
  if (!VrmScenePC) {
    console.error('[VrmScene] pc.createScript が null を返しました。');
    return;
  }

  VrmScenePC.attributes.add('modelsInfoUrl', {
    type: 'string',
    default: '/threedmodels/models-info.json',
    title: 'Models Info JSON URL',
    description: 'VRM/VRMA/Stage 情報の JSON ファイルパス',
  });
  VrmScenePC.attributes.add('cameraFov', { type: 'number', default: 50, title: 'Camera FOV' });
  VrmScenePC.attributes.add('cameraPosY', { type: 'number', default: 1.5, title: 'Camera Position Y' });
  VrmScenePC.attributes.add('cameraPosZ', { type: 'number', default: -2.5, title: 'Camera Position Z' });

  const proto = VrmScenePC.prototype as unknown as VrmPCInstance;

  proto.initialize = function (this: VrmPCInstance) {
    const canvas = this.app.graphicsDevice.canvas as HTMLCanvasElement;
    this._initThreeScene(canvas);
    this._lipSync = new LipSync(new AudioContext());
    void this._loadInitAssets();
  };

  proto.update = function (this: VrmPCInstance, dt: number) {
    if (this._lipSync) {
      const { volume } = this._lipSync.update();
      this.emoteController?.lipSync('aa', volume);
    }
    this.emoteController?.update(dt);
    this._currentAnimationMixer?.update(dt);
    this._currentVrm?.update(dt);
    this._orbitControls?.update();
    if (this._threeRenderer && this._threeScene && this._threeCamera) {
      this._threeRenderer.render(this._threeScene, this._threeCamera);
    }
  };

  proto._initThreeScene = function (this: VrmPCInstance, pcCanvas: HTMLCanvasElement) {
    const w = pcCanvas.clientWidth;
    const h = pcCanvas.clientHeight;

    const threeCanvas = document.createElement('canvas');
    threeCanvas.id = 'three-canvas';
    threeCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;';
    pcCanvas.parentElement?.appendChild(threeCanvas);
    this._threeCanvas = threeCanvas;

    const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    this._threeRenderer = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    this._threeScene = scene;

    const ambient = new THREE.AmbientLight(0xffffff);
    ambient.position.set(0, 1, -2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 1, -2);
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLightHelper(dirLight, 2));

    const camera = new THREE.PerspectiveCamera(this.cameraFov, w / h, 0.01);
    camera.position.set(0, this.cameraPosY, this.cameraPosZ);
    this._threeCamera = camera;

    const controls = new OrbitControls(camera, threeCanvas);
    controls.target.set(0, 0.75 * 1.5, 0);
    controls.update();
    this._orbitControls = controls;

    this._currentVrm = null;
    this._currentAnimationMixer = null;
    this._currentAnimationClipActions = [];
    this.emoteController = null;

    window.addEventListener('resize', () => {
      const nw = pcCanvas.clientWidth;
      const nh = pcCanvas.clientHeight;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    });
  };

  proto._loadInitAssets = async function (this: VrmPCInstance) {
    const res = await fetch(this.modelsInfoUrl);
    const modelInfos: ModelsInfo = await res.json();

    buildAnimationButtons(modelInfos.animations, async (anim) => {
      const r = await fetch(anim.path);
      await this.updateVrmAnimationArrayBuffer(await r.arrayBuffer());
    });

    const vrmRes = await fetch(modelInfos.vrms[0].path);
    await this.updateVrmArrayBuffer(await vrmRes.arrayBuffer());

    if (this._currentVrm && this._threeCamera) {
      this.emoteController = new EmoteController(this._currentVrm, this._threeCamera);
    }

    const vrmaRes = await fetch(modelInfos.animations[0].path);
    await this.updateVrmAnimationArrayBuffer(await vrmaRes.arrayBuffer());

    const stageIdx = Math.floor(Math.random() * modelInfos.stages.length);
    await Promise.all(
      modelInfos.stages[stageIdx].pathes.map(async (path) => {
        const r = await fetch(path);
        return this.updateGlbArrayBuffer(await r.arrayBuffer());
      }),
    );

    const loadingEl = document.getElementById('loading-screen');
    if (loadingEl) loadingEl.classList.add('hidden');
  };

  proto.updateVrmArrayBuffer = async function (this: VrmPCInstance, arrayBuffer: ArrayBuffer) {
    if (this._currentVrm && this._threeScene) {
      this._threeScene.remove(this._currentVrm.scene);
      this._currentVrm = null;
      this._currentAnimationMixer = null;
      this._currentAnimationClipActions = [];
    }
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrm = gltf.userData.vrm as VRM;
    this._threeScene?.add(vrm.scene);
    this._currentVrm = vrm;
    this._currentAnimationMixer = new THREE.AnimationMixer(vrm.scene);
    return vrm;
  };

  proto.updateVrmUrl = async function (this: VrmPCInstance, url: string) {
    const loader = new GLTFLoader();
    loader.register((p) => new VRMLoaderPlugin(p));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    if (this._currentVrm && this._threeScene) this._threeScene.remove(this._currentVrm.scene);
    this._threeScene?.add(vrm.scene);
    this._currentVrm = vrm;
    this._currentAnimationMixer = new THREE.AnimationMixer(vrm.scene);
    return vrm;
  };

  proto.updateGlbArrayBuffer = async function (this: VrmPCInstance, arrayBuffer: ArrayBuffer) {
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(arrayBuffer, '');
    this._threeScene?.add(gltf.scene);
  };

  proto.updateVrmAnimationArrayBuffer = async function (this: VrmPCInstance, arrayBuffer: ArrayBuffer) {
    const loader = new GLTFLoader();
    loader.register((p) => new VRMAnimationLoaderPlugin(p));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrmAnimations = gltf.userData.vrmAnimations as Parameters<typeof createVRMAnimationClip>[0][];

    if (this._currentVrm && this._currentAnimationMixer && vrmAnimations) {
      this._currentAnimationMixer.stopAllAction();
      this._currentAnimationClipActions = [];
      for (const vrmAnimation of vrmAnimations) {
        const clip = createVRMAnimationClip(vrmAnimation, this._currentVrm);
        const action = this._currentAnimationMixer.clipAction(clip);
        this._currentAnimationClipActions.push(action);
        action.play();
      }
    }
  };

  proto.speakVrm = async function (this: VrmPCInstance, buffer: ArrayBuffer, expression: string) {
    this.emoteController?.playEmotion(expression);
    await new Promise<void>((resolve) => {
      this._lipSync?.playFromArrayBuffer(buffer, () => resolve());
    });
  };
})();
