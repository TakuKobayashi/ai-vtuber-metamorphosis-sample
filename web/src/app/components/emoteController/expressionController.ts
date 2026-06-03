import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { AutoLookAt } from './autoLookAt';
import { AutoBlink } from './autoBlink';

interface LipSyncState {
  preset: string;
  value: number;
}

export class ExpressionController {
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
      const weight = this.currentEmotion === 'neutral' ? this.currentLipSync.value * 0.5 : this.currentLipSync.value * 0.25;
      this.expressionManager?.setValue(this.currentLipSync.preset, weight);
    }
  }
}
