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
