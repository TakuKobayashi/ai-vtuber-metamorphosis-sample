/**
 * ExpressionController - VRM表情管理クラス
 *
 * 前の表情をリセットしてから次の表情を適用する。
 * 自動瞬き・視線制御も担当。
 */
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { AutoLookAt } from './autoLookAt.js';
import { AutoBlink } from './autoBlink.js';

interface LipSyncState {
  preset: string;
  value: number;
}

export class ExpressionController {
  // 視線追従のために保持（GC されないよう保持するだけで直接参照しない）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly autoLookAt: AutoLookAt;
  private autoBlink: AutoBlink | undefined;
  private expressionManager: VRM['expressionManager'];
  private currentEmotion: string;
  private currentLipSync: LipSyncState | null;

  constructor(vrm: VRM, threeCamera: THREE.Camera) {
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
      const weight =
        this.currentEmotion === 'neutral'
          ? this.currentLipSync.value * 0.5
          : this.currentLipSync.value * 0.25;
      this.expressionManager?.setValue(this.currentLipSync.preset, weight);
    }
  }
}
