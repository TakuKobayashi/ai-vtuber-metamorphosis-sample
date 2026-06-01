'use client';

import React from 'react';
import axios from 'axios';
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
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { LipSync } from './lipSync/lipSync';
import { EmoteController } from './emoteController/emoteController';

export class ThreeScene extends React.Component {
  #canvas = null;
  #scene = null;
  #camera = null;
  #renderer = null;
  #clock = null;
  #frameId = null;
  #currentVrm = null;
  #currentAnimationMixer = null;
  #currentAnimaionClipActions = [];
  #_lipSync = null;
  emoteController;

  constructor(props) {
    super(props);
    this.animate = this.animate.bind(this);
  }

  componentDidMount() {
    this.#_lipSync = new LipSync(new AudioContext());
  }

  onCanvasLoaded = (canvas) => {
    this.#initScene(canvas);
    this.#loadInitAssets();
  };

  async #loadInitAssets() {
    const modelInfoResponse = await axios.get('/threedmodels/models-info.json');
    const modelInfos = modelInfoResponse.data;
    const vrmModel = modelInfos.vrms[0].path;
    const vrmDataResponse = await axios.get(vrmModel, { responseType: 'arraybuffer' });
    await this.updateVrmArryaBuffer(vrmDataResponse.data);
    this.emoteController = new EmoteController(this.#currentVrm, this.#camera);

    const vrmaDataAnimationResponse = await axios.get(modelInfos.animations[0].path, { responseType: 'arraybuffer' });
    await this.updateVrmAnimationArryaBuffer(vrmaDataAnimationResponse.data);
    const stageRandomIndex = Math.floor(Math.random() * modelInfos.stages.length);
    const stagePartUrls = modelInfos.stages[stageRandomIndex].pathes;
    const cyberStagePartModelResponses = await Promise.all(
      stagePartUrls.map((cyberStagePartUrl) => axios.get(cyberStagePartUrl, { responseType: 'arraybuffer' })),
    );
    await Promise.all(
      cyberStagePartModelResponses.map((cyberStagePartModelResponse) => this.updateGlbArryaBuffer(cyberStagePartModelResponse.data)),
    );
  }

  #initScene(canvas) {
    if (!canvas) {
      return;
    }
    const renderer = new WebGLRenderer({ canvas: canvas, antialias: true });
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.#canvas = canvas;
    const scene = new Scene();
    scene.background = new Color(0x212121);

    const ambientLight = new AmbientLight(0xffffff);
    ambientLight.position.set(0, 1, -2);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff);
    directionalLight.position.set(0, 1, -2);
    scene.add(directionalLight);

    //DirectionalLightHelper: 光源に一と方向を可視化するデバッグのために入れるもの参考: https://qiita.com/kskwtnk/items/157b04ffef659dc5f7d9
    const directionalLightHelper = new DirectionalLightHelper(directionalLight, 2);
    scene.add(directionalLightHelper);

    this.#scene = scene;
    const camera = new PerspectiveCamera(50, width / height, 0.01);
    camera.position.set(0, 1.5, -2.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.75 * 1.5, 0);
    controls.update();
    this.#camera = camera;
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    this.#renderer = renderer;

    this.#clock = new Clock();
    this.#clock.start();

    this.animate();
  }

  async updateVrmUrl(url) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    const gltf = await gltfLoader.loadAsync(url);
    const vrm = gltf.userData.vrm;
    if (this.#scene) {
      this.#scene.add(vrm.scene);
    }
    this.#currentVrm = vrm;
    this.#currentAnimationMixer = new AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateVrmArryaBuffer(arrayBuffer) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    const gltf = await gltfLoader.parseAsync(arrayBuffer, '');
    const vrm = gltf.userData.vrm;
    if (this.#scene) {
      this.#scene.add(vrm.scene);
    }
    this.#currentVrm = vrm;
    this.#currentAnimationMixer = new AnimationMixer(vrm.scene);
    return vrm;
  }

  async updateGlbArryaBuffer(arrayBuffer) {
    const gltfLoader = new GLTFLoader();
    const gltf = await gltfLoader.parseAsync(arrayBuffer, '');
    if (this.#scene) {
      this.#scene.add(gltf.scene);
    }
    return gltf;
  }

  async updateVrmAnimationArryaBuffer(arrayBuffer) {
    const gltfLoader = new GLTFLoader();
    gltfLoader.register((parser) => {
      return new VRMAnimationLoaderPlugin(parser);
    });
    const gltf = await gltfLoader.parseAsync(arrayBuffer, '');
    const vrmAnimations = gltf.userData.vrmAnimations;
    if (this.#currentVrm && vrmAnimations) {
      this.#currentAnimationMixer?.stopAllAction();
      this.#currentAnimaionClipActions = [];
      for (const vrmAnimation of vrmAnimations) {
        const clip = createVRMAnimationClip(vrmAnimation, this.#currentVrm);
        const currentAnimaionClipAction = this.#currentAnimationMixer.clipAction(clip);
        this.#currentAnimaionClipActions.push(currentAnimaionClipAction);
        currentAnimaionClipAction.play();
      }
    }
    return gltf;
  }

  /**
   * 音声を再生し、リップシンクを行う
   */
  async speakVrm(buffer, expression) {
    this.emoteController?.playEmotion(expression);
    await new Promise((resolve) => {
      this.#_lipSync?.playFromArrayBuffer(buffer, () => {
        resolve(true);
      });
    });
  }

  animate() {
    // 次のフレームを要求
    this.#frameId = window.requestAnimationFrame(this.animate);

    if (this.#clock) {
      const deltaTime = this.#clock.getDelta();
      if (this.#_lipSync) {
        const { volume } = this.#_lipSync.update();
        this.emoteController?.lipSync('aa', volume);
      }

      this.emoteController?.update(deltaTime);
      if (this.#currentAnimationMixer) {
        this.#currentAnimationMixer.update(deltaTime);
      }
      if (this.#currentVrm) {
        this.#currentVrm.update(deltaTime);
      }
    }

    if (this.#renderer && this.#scene && this.#camera) {
      this.#renderer.render(this.#scene, this.#camera);
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
