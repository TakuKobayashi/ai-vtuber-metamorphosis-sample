/**
 * AutoLookAt - VRMの視線をカメラに向けるクラス
 *
 * vrm.lookAt.target に Three.js の Object3D を設定することで
 * カメラ方向への視線追従を実現する。
 */
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

export class AutoLookAt {
  private readonly lookAtTarget: THREE.Object3D;

  constructor(vrm: VRM, threeCamera: THREE.Camera) {
    this.lookAtTarget = new THREE.Object3D();
    threeCamera.add(this.lookAtTarget);

    if (vrm.lookAt) {
      vrm.lookAt.target = this.lookAtTarget;
    }
  }
}
