import { getEnglishAudioFileNameByKey, SYSTEM_AUDIO_FILES } from '../components/jung-voice-assessment/constants';

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
 * 音声ファイルのフルパスを生成（基本的なファイル名用）
 */
export function getAudioPath(filename: string): string {
  return `${audioBasePath}/${filename}`;
}

/**
 * 単語音声ファイルのパスを生成（言語とキーに対応）
 */
export function getWordAudioPath(key: string | number, language: 'ja' | 'en' = 'ja'): string {
  if (language === 'ja') {
    return `${audioBasePath}/${key}.mp3`;
  } else {
    const englishFileName = getEnglishAudioFileNameByKey(key);
    return `${audioBasePath}/en/${englishFileName}`;
  }
}

/**
 * システムメッセージ音声ファイルのパスを生成
 */
export function getSystemAudioPath(type: 'welcome' | 'completion' | 'nextWord', language: 'ja' | 'en' = 'ja'): string {
  const filename = SYSTEM_AUDIO_FILES[language][type];
  if (language === 'en') {
    return `${audioBasePath}/en/${filename}`;
  }
  return `${audioBasePath}/${filename}`;
}

