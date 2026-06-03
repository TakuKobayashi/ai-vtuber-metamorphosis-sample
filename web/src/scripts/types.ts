/**
 * models-info.json のデータ型定義
 */

export interface StageInfo {
  name: string;
  pathes: string[];
}

export interface VrmInfo {
  name: string;
  path: string;
}

export interface AnimationInfo {
  name: string;
  displayName: string;
  path: string;
}

export interface ModelsInfo {
  stages: StageInfo[];
  vrms: VrmInfo[];
  animations: AnimationInfo[];
}
