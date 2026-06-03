import type { VRMExpressionManager } from '@pixiv/three-vrm';

const BLINK_CLOSE_MAX = 0.12;
const BLINK_OPEN_MAX = 5;

export class AutoBlink {
  private readonly expressionManager: VRMExpressionManager;
  private remainingTime: number;
  private isOpen: boolean;
  private isAutoBlink: boolean;

  constructor(expressionManager: VRMExpressionManager) {
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
