'use client';

import React from 'react';
import * as pc from 'playcanvas';
import { VrmScene } from './vrmScene';

interface Props {}

/**
 * PlayCanvasScene
 *
 * 元の ThreeScene (three-scene.jsx) を PlayCanvas + Three.js に置き換えたコンポーネント。
 * - canvas の見た目・サイズ横幅 100vw × 高さ 56.25vw (16:9)
 * - PlayCanvas Application をメインループとして使い、その update に
 *   Three.js + @pixiv/three-vrm の描画を接続する
 * - VrmScene クラスのメソッド（updateVrmAnimationArrayBuffer など）を
 *   ref 経由で page.tsx から呼び出せるよう公開する
 */
export class PlayCanvasScene extends React.Component<Props> {
  private canvasRef = React.createRef<HTMLCanvasElement>();
  private app: pc.Application | null = null;
  private vrmScene: VrmScene | null = null;

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (!canvas) return;
    this.initPlayCanvas(canvas);
  }

  componentWillUnmount() {
    this.app?.destroy();
    this.app = null;
    this.vrmScene = null;
  }

  private initPlayCanvas(canvas: HTMLCanvasElement) {
    // PlayCanvas Application を初期化
    // Three.js が描画を担うため PlayCanvas 側は最小限の設定にする
    const app = new pc.Application(canvas, {
      graphicsDeviceOptions: { antialias: false, alpha: true },
      mouse: new pc.Mouse(canvas),
      keyboard: new pc.Keyboard(window),
    });
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    // ダミーカメラ（PlayCanvas は最低1カメラ必要）
    const dummyCamera = new pc.Entity('DummyCamera');
    dummyCamera.addComponent('camera', {
      clearColor: new pc.Color(0, 0, 0, 0),
      farClip: 0.001,
    });
    app.root.addChild(dummyCamera);

    // VrmScene 初期化（canvas の親要素のサイズで Three.js canvas を生成する）
    const vrmScene = new VrmScene(app, canvas, {
      modelsInfoUrl: '/threedmodels/models-info.json',
      cameraFov: 50,
      cameraPosY: 1.5,
      cameraPosZ: -2.5,
    });

    // PlayCanvas のメインループに Three.js の update を接続
    app.on('update', (dt: number) => {
      vrmScene.update(dt);
    });

    app.start();

    // 初期アセットのロード
    vrmScene.loadInitAssets().catch((err: unknown) => {
      console.error('初期アセットのロードに失敗しました:', err);
    });

    this.app = app;
    this.vrmScene = vrmScene;
  }

  // -------------------------------------------------------
  // page.tsx から ref 経由で呼び出せる公開メソッド群
  // （元の ThreeScene と同じメソッド名に合わせる）
  // -------------------------------------------------------

  async updateVrmAnimationArryaBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.vrmScene?.updateVrmAnimationArrayBuffer(arrayBuffer);
  }

  async updateVrmArryaBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.vrmScene?.updateVrmArrayBuffer(arrayBuffer);
  }

  async replaceVrmArryaBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.vrmScene?.replaceVrmArrayBuffer(arrayBuffer);
  }

  async updateGlbArryaBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.vrmScene?.updateGlbArrayBuffer(arrayBuffer);
  }

  async speakVrm(buffer: ArrayBuffer, expression: string): Promise<void> {
    await this.vrmScene?.speakVrm(buffer, expression);
  }

  render() {
    return (
      <div style={{ position: 'relative', width: '100vw', height: '56.25vw' }}>
        {/*
         * PlayCanvas が使う canvas。
         * Three.js の WebGLRenderer canvas は VrmScene 内で動的に生成され
         * この div に appendChild される。
         */}
        <canvas
          ref={this.canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    );
  }
}
