import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import type { AppBase } from 'playcanvas';
import { EmoteController } from './emoteController/emoteController';
import { LipSync } from './lipSync/lipSync';
import type { ModelsInfo } from './types';

export interface VrmSceneOptions {
  modelsInfoUrl?: string;
  cameraFov?: number;
  cameraPosY?: number;
  cameraPosZ?: number;
}

export class VrmScene {
  private threeScene: THREE.Scene | null = null;
  private threeCamera: THREE.PerspectiveCamera | null = null;
  private threeRenderer: THREE.WebGLRenderer | null = null;
  private orbitControls: OrbitControls | null = null;

  private currentVrm: VRM | null = null;
  private currentAnimationMixer: THREE.AnimationMixer | null = null;
  private currentAnimationClipActions: THREE.AnimationAction[] = [];

  private lipSync: LipSync | null = null;
  public emoteController: EmoteController | null = null;

  private readonly modelsInfoUrl: string;
  private readonly cameraFov: number;
  private readonly cameraPosY: number;
  private readonly cameraPosZ: number;

  constructor(_app: AppBase, canvas: HTMLCanvasElement, options: VrmSceneOptions = {}) {
    this.modelsInfoUrl = options.modelsInfoUrl ?? '/threedmodels/models-info.json';
    this.cameraFov = options.cameraFov ?? 50;
    this.cameraPosY = options.cameraPosY ?? 1.5;
    this.cameraPosZ = options.cameraPosZ ?? -2.5;

    this.initThreeScene(canvas);
    this.lipSync = new LipSync(new AudioContext());
  }

  /** 毎フレーム呼び出す */
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

  /** models-info.json を読んで初期 VRM / VRMA / Stage をロードする */
  async loadInitAssets(): Promise<void> {
    const response = await fetch(this.modelsInfoUrl);
    const modelInfos: ModelsInfo = await response.json();

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
  }

  /** アニメーション一覧を返す（UIのボタン生成に使う） */
  async fetchAnimationList(): Promise<ModelsInfo['animations']> {
    const response = await fetch(this.modelsInfoUrl);
    const modelInfos: ModelsInfo = await response.json();
    return modelInfos.animations;
  }

  // -------------------------------------------------------
  // ロードメソッド群
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
    const vrmAnimations = gltf.userData.vrmAnimations as Parameters<
      typeof createVRMAnimationClip
    >[0][];

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
    const wrapper = pcCanvas.parentElement as HTMLElement;
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;

    const threeCanvas = document.createElement('canvas');
    threeCanvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    wrapper.appendChild(threeCanvas);

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

    const camera = new THREE.PerspectiveCamera(this.cameraFov, w / h, 0.01);
    camera.position.set(0, this.cameraPosY, this.cameraPosZ);
    this.threeCamera = camera;

    const controls = new OrbitControls(camera, threeCanvas);
    controls.target.set(0, 0.75 * 1.5, 0);
    controls.update();
    this.orbitControls = controls;

    const onResize = () => {
      const nw = wrapper.clientWidth;
      const nh = wrapper.clientHeight;
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
  }
}
