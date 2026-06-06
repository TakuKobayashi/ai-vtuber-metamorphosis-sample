'use client';

import React from 'react';
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  Color,
  DirectionalLightHelper,
  AnimationMixer,
  Clock,
  type AnimationAction,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import type { VRM } from '@pixiv/three-vrm';
import {
  createVRMAnimationClip,
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
} from '@pixiv/three-vrm-animation';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { LipSync } from './lipSync/lipSync';
import { EmoteController } from './emoteController/emoteController';

interface ThreeSceneState {}

/**
 * ThreeScene - 元の three-scene.jsx を TypeScript / TSX に書き換えたもの。
 * ※ PlayCanvas 版への移行後も残っているため、参照用として維持する。
 * アクティブに使われるのは PlayCanvasScene.tsx。
 */
export class ThreeScene extends React.Component<Record<string, never>, ThreeSceneState> {
  private canvas: HTMLCanvasElement | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private renderer: WebGLRenderer | null = null;
  private clock: Clock | null = null;
  private frameId: number | null = null;
  private currentVrm: VRM | null = null;
  private currentAnimationMixer: AnimationMixer | null = null;
  private currentAnimationClipActions: AnimationAction[] = [];
  private lipSyncInstance: LipSync | null = null;
  public emoteController: EmoteController | undefined;

  constructor(props: Record<string, never>) {
    super(props);
    this.animate = this.animate.bind(this);
  }

  componentDidMount() {
    this.lipSyncInstance = new LipSync(new AudioContext());
  }

  onCanvasLoaded = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    this.initScene(canvas);
    void this.loadInitAssets();
  };

  private async loadInitAssets(): Promise<void> {
    const res = await fetch('/threedmodels/models-info.json');
    const modelInfos = (await res.json()) as {
      vrms: { path: string }[];
      animations: { path: string }[];
      stages: { pathes: string[] }[];
    };

    const vrmRes = await fetch(modelInfos.vrms[0].path);
    await this.updateVrmArryaBuffer(await vrmRes.arrayBuffer());
    this.emoteController = new EmoteController(this.currentVrm!, this.camera!);

    const vrmaRes = await fetch(modelInfos.animations[0].path);
    await this.updateVrmAnimationArryaBuffer(await vrmaRes.arrayBuffer());

    const stageIndex = Math.floor(Math.random() * modelInfos.stages.length);
    await Promise.all(
      modelInfos.stages[stageIndex].pathes.map(async (url) => {
        const r = await fetch(url);
        return this.updateGlbArryaBuffer(await r.arrayBuffer());
      }),
    );
  }

  private initScene(canvas: HTMLCanvasElement): void {
    const renderer = new WebGLRenderer({ canvas, antialias: true });
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.canvas = canvas;

    const scene = new Scene();
    scene.background = new Color(0x212121);

    const ambientLight = new AmbientLight(0xffffff);
    ambientLight.position.set(0, 1, -2);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff);
    directionalLight.position.set(0, 1, -2);
    scene.add(directionalLight);

    // DirectionalLightHelper: 光源位置と方向を可視化するデバッグ用
    const directionalLightHelper = new DirectionalLightHelper(directionalLight, 2);
    scene.add(directionalLightHelper);

    this.scene = scene;

    const camera = new PerspectiveCamera(50, width / height, 0.01);
    camera.position.set(0, 1.5, -2.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.75 * 1.5, 0);
    controls.update();
    this.camera = camera;

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer = renderer;

    this.clock = new Clock();
    this.clock.start();

    this.animate();
  }

  async updateVrmUrl(url: string): Promise<VRM> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    if (vrm.lookAt) {
      const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
      proxy.name = 'VRMLookAtQuaternionProxy';
      vrm.scene.add(proxy);
    }
    this.scene?.add(vrm.scene);
    this.currentVrm = vrm;
    this.currentAnimationMixer = new AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateVrmArryaBuffer(arrayBuffer: ArrayBuffer): Promise<VRM> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrm = gltf.userData.vrm as VRM;
    if (vrm.lookAt) {
      const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
      proxy.name = 'VRMLookAtQuaternionProxy';
      vrm.scene.add(proxy);
    }
    this.scene?.add(vrm.scene);
    this.currentVrm = vrm;
    this.currentAnimationMixer = new AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateGlbArryaBuffer(arrayBuffer: ArrayBuffer): Promise<GLTF> {
    const loader = new GLTFLoader();
    const gltf = await loader.parseAsync(arrayBuffer, '');
    this.scene?.add(gltf.scene);
    return gltf;
  }

  async updateVrmAnimationArryaBuffer(arrayBuffer: ArrayBuffer): Promise<GLTF> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrmAnimations = gltf.userData.vrmAnimations as Parameters<
      typeof createVRMAnimationClip
    >[0][];
    if (this.currentVrm && vrmAnimations) {
      this.currentAnimationMixer?.stopAllAction();
      this.currentAnimationClipActions = [];
      for (const vrmAnimation of vrmAnimations) {
        const clip = createVRMAnimationClip(vrmAnimation, this.currentVrm);
        const action = this.currentAnimationMixer!.clipAction(clip);
        this.currentAnimationClipActions.push(action);
        action.play();
      }
    }
    return gltf;
  }

  /** 音声を再生し、リップシンクを行う */
  async speakVrm(buffer: ArrayBuffer, expression: string): Promise<void> {
    this.emoteController?.playEmotion(expression);
    await new Promise<void>((resolve) => {
      this.lipSyncInstance?.playFromArrayBuffer(buffer, () => resolve());
    });
  }

  animate(): void {
    this.frameId = window.requestAnimationFrame(this.animate);

    if (this.clock) {
      const deltaTime = this.clock.getDelta();
      if (this.lipSyncInstance) {
        const { volume } = this.lipSyncInstance.update();
        this.emoteController?.lipSync('aa', volume);
      }
      this.emoteController?.update(deltaTime);
      this.currentAnimationMixer?.update(deltaTime);
      this.currentVrm?.update(deltaTime);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  render() {
    return (
      <div>
        <canvas style={{ width: '90vw', height: '40vw' }} ref={this.onCanvasLoaded} />
      </div>
    );
  }
}
