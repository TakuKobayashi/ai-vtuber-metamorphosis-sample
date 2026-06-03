/**
 * LipSync - 音声音量をリアルタイムで解析してリップシンクに使うクラス
 */

const TIME_DOMAIN_DATA_LENGTH = 2048;

export interface LipSyncUpdateResult {
  volume: number;
}

export class LipSync {
  private readonly audio: AudioContext;
  private readonly analyser: AnalyserNode;
  private readonly timeDomainData: Float32Array<ArrayBuffer>;

  constructor(audio: AudioContext) {
    this.audio = audio;
    this.analyser = audio.createAnalyser();
    this.timeDomainData = new Float32Array(TIME_DOMAIN_DATA_LENGTH) as Float32Array<ArrayBuffer>;
  }

  update(): LipSyncUpdateResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData);

    let volume = 0.0;
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]));
    }

    // シグモイド関数で音量をスムージング
    volume = 1 / (1 + Math.exp(-45 * volume + 5));
    if (volume < 0.1) volume = 0;

    return { volume };
  }

  async playFromArrayBuffer(buffer: ArrayBuffer, onEnded?: () => void): Promise<void> {
    const audioBuffer = await this.audio.decodeAudioData(buffer);
    const bufferSource = this.audio.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.audio.destination);
    bufferSource.connect(this.analyser);
    bufferSource.start();
    if (onEnded) {
      bufferSource.addEventListener('ended', onEnded);
    }
  }

  async playFromURL(url: string, onEnded?: () => void): Promise<void> {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    await this.playFromArrayBuffer(buffer, onEnded);
  }
}
