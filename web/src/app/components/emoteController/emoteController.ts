import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { ExpressionController } from './expressionController';

export class EmoteController {
  private readonly expressionController: ExpressionController;

  constructor(vrm: VRM, threeCamera: THREE.Camera) {
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
