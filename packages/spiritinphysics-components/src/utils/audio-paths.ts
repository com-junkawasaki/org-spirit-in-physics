/**
 * 音声ファイルのパス設定
 * アプリ側で音声ファイルのベースパスをカスタマイズ可能にする
 */
let audioBasePath = '/audio/jung-voice-assessment';

/**
 * 音声ファイルのベースパスを設定
 */
export function setAudioBasePath(path: string) {
  audioBasePath = path;
}

/**
 * 音声ファイルのベースパスを取得
 */
export function getAudioBasePath(): string {
  return audioBasePath;
}

/**
 * 音声ファイルのフルパスを生成
 */
export function getAudioPath(filename: string): string {
  return `${audioBasePath}/${filename}`;
}

