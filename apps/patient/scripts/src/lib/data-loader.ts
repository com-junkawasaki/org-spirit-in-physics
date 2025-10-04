import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { supabase } from './supabase';
import type { Participant } from './database/supabase-manager';

// サーバーサイドでのみインポート
let blobStorage: any = null;

if (typeof window === 'undefined') {
  try {
    const blobModule = require('./blob-storage');
    blobStorage = blobModule.BlobStorage;
  } catch (error) {
    console.warn('Blob storage not available:', error);
  }
}

const ARTIFACTS_CACHE_PATH = '/Users/junkawasaki/jun784/root/procs/250901-com-junkawasaki-spiritinphysics/.artifacts_cache';

// Supabase初期化関数
export async function initializeSupabaseDatabase(): Promise<void> {
  try {
    // Supabase接続テスト
    const { data, error } = await supabase
      .from('participants')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection failed:', error);
      throw error;
    }

    console.log('Supabase database connection established');
  } catch (error) {
    console.error('Failed to initialize Supabase database:', error);
    throw error;
  }
}

// 後方互換性のための関数
export const initializeKuzuDatabase = initializeSupabaseDatabase;

// Types based on actual data structure
export interface ConsentData {
  participantId: string;
  signature: string;
  agreements?: {
    understand: boolean;
    voluntary: boolean;
    withdraw: boolean;
    recording: boolean;
  };
  agreedAt: string;
}

export interface SessionEvent {
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface SessionData {
  participantId: string;
  events: SessionEvent[];
  wordResponses: unknown[];
}

export interface Participant {
  id: string;
  signature: string;
  agreedAt: Date;
  hasSessionData: boolean;
  hasVideoFiles: boolean;
  videoFiles: string[];
}

// Parse database.jsonl file
export async function loadConsentDataFromDatabase(): Promise<ConsentData[]> {
  try {
    // まずBlobからデータを取得しようとする
    if (blobStorage) {
      try {
        const participantIds = await blobStorage.getAllParticipants();
        const consentData: ConsentData[] = [];

        for (const participantId of participantIds) {
          try {
            // Check if participant exists before attempting to download
            const exists = await blobStorage.participantExists(participantId);
            if (!exists) {
              console.warn(`Participant ${participantId} does not exist in Blob storage, skipping`);
              continue;
            }
            const participantData = await blobStorage.getParticipantData(participantId);
            consentData.push(participantData);
          } catch (error) {
            console.warn(`Failed to load participant data from Blob for ${participantId}:`, error);
          }
        }

        if (consentData.length > 0) {
          console.log(`Loaded ${consentData.length} participants from Vercel Blob`);

          // Supabaseにも保存
          for (const data of consentData) {
            const { supabaseManager } = await import('./database/supabase-manager.ts');
            const participant: Participant = {
              id: data.participantId,
              signature: data.signature,
              agreedAt: new Date(data.agreedAt || new Date()),
              agreements: data.agreements || {}
            };

            try {
              await supabaseManager.saveParticipant(participant);
            } catch (saveError) {
              console.warn('Failed to save participant to Supabase:', saveError);
            }
          }

          return consentData;
        }
      } catch (blobError) {
        console.warn('Failed to load from Vercel Blob, falling back to file system:', blobError);
      }
    }

    // Fallback: ファイルシステムから読み込み
    const databasePath = join(ARTIFACTS_CACHE_PATH, 'database.jsonl');
    if (!existsSync(databasePath)) {
      return [];
    }

    const content = readFileSync(databasePath, 'utf-8');
    const lines = content.trim().split('\n');

    const consentData = lines.map(line => {
      try {
        const record = JSON.parse(line);
        if (record.type === 'consent') {
          return record.data as ConsentData;
        }
      } catch (error) {
        console.error('Error parsing database line:', error);
      }
      return null;
    }).filter((data): data is ConsentData => data !== null);

    // 読み込んだデータをBlobに保存
    if (blobStorage) {
      for (const data of consentData) {
        try {
          await blobStorage.saveParticipantData(data.participantId, data);
        } catch (saveError) {
          console.warn('Failed to save participant data to Blob:', saveError);
        }
      }
    }

    // Supabaseにも保存
    for (const data of consentData) {
      const { supabaseManager } = await import('./database/supabase-manager');
      const participant: Participant = {
        id: data.participantId,
        signature: data.signature,
        agreedAt: data.agreedAt || new Date().toISOString(),
        agreements: data.agreements || {}
      };

      try {
        await supabaseManager.saveParticipant(participant);
      } catch (saveError) {
        console.warn('Failed to save participant to Supabase:', saveError);
      }
    }

    return consentData;
  } catch (error) {
    console.error('Error loading consent data from database:', error);
    return [];
  }
}

// Get all participant directories
export function getParticipantDirectories(): string[] {
  try {
    const entries = readdirSync(ARTIFACTS_CACHE_PATH, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch (error) {
    console.error('Error reading participant directories:', error);
    return [];
  }
}

// Load participant data from individual directory
export function loadParticipantData(participantId: string): Participant | null {
  try {
    const participantPath = join(ARTIFACTS_CACHE_PATH, participantId);
    if (!existsSync(participantPath)) {
      return null;
    }

    // Load consent data
    const consentPath = join(participantPath, 'consent.json');
    if (!existsSync(consentPath)) {
      return null;
    }

    const consentData: ConsentData = JSON.parse(readFileSync(consentPath, 'utf-8'));

    // Check for session data
    const sessionDataPath = join(participantPath, 'session_data.json');
    const hasSessionData = existsSync(sessionDataPath);

    // Check for video files
    const entries = readdirSync(participantPath);
    const videoFiles = entries.filter(entry => entry.endsWith('.webm'));

    return {
      id: participantId,
      signature: consentData.signature,
      agreedAt: new Date(consentData.agreedAt),
      hasSessionData,
      hasVideoFiles: videoFiles.length > 0,
      videoFiles
    };
  } catch (error) {
    console.error(`Error loading participant data for ${participantId}:`, error);
    return null;
  }
}

// Load session data for a participant
export async function loadSessionData(participantId: string): Promise<SessionData | null> {
  try {
    // Supabaseデータベースからセッションデータを取得（一本化）
    try {
      // Supabaseからセッションデータを取得
      // 実際のクエリ実装はSupabaseManagerで実装する必要がある
      // 現時点では仮の実装
      console.log(`Loading session data from Supabase for ${participantId}`);
      // TODO: SupabaseManagerにgetSessionDataメソッドを実装
      return null; // 仮実装
    } catch (supabaseError) {
      console.warn('Failed to load session data from Supabase:', supabaseError);
      return null;
    }
  } catch (error) {
    console.error(`Error loading session data for ${participantId}:`, error);
    return null;
  }
}

// Parse word responses from session events
export function parseWordResponsesFromEvents(events: SessionEvent[]): Array<{
  stimulusWord: string;
  responseWord: string;
  reactionTimeMs: number;
  isDelayed: boolean;
  timestamp: number;
}> {
  const wordResponses: Array<{
    stimulusWord: string;
    responseWord: string;
    reactionTimeMs: number;
    isDelayed: boolean;
    timestamp: number;
  }> = [];

  // Group events by word
  const wordEvents: Record<string, SessionEvent[]> = {};

  events.forEach(event => {
    if (event.payload?.word) {
      const word = event.payload.word;
      if (!wordEvents[word]) {
        wordEvents[word] = [];
      }
      wordEvents[word].push(event);
    }
  });

  // Process each word's events
  Object.entries(wordEvents).forEach(([word, wordEventList]) => {
    const wordDisplayedEvent = wordEventList.find(e => e.type === 'word_displayed');
    const speechDetectedEvent = wordEventList.find(e => e.type === 'speech_detected');
    const responseWindowClosedEvent = wordEventList.find(e => e.type === 'response_window_closed');

    if (wordDisplayedEvent && speechDetectedEvent && responseWindowClosedEvent) {
      const reactionTime = speechDetectedEvent.timestamp - wordDisplayedEvent.timestamp;
      const isDelayed = responseWindowClosedEvent.timestamp - speechDetectedEvent.timestamp > 1000; // 1秒以上遅延

      wordResponses.push({
        stimulusWord: word,
        responseWord: word, // Assuming the response is the same word for now
        reactionTimeMs: reactionTime,
        isDelayed,
        timestamp: speechDetectedEvent.timestamp
      });
    }
  });

  return wordResponses;
}

// Load all participants data
export async function loadAllParticipants(): Promise<Participant[]> {
  try {
    // Supabaseから参加者データを取得
    const { data: participants, error } = await supabase
      .from('participants')
      .select(`
        *,
        sessions (
          id
        ),
        video_files (
          id,
          file_name,
          file_path,
          file_size
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading participants from Supabase:', error);
      return [];
    }

    console.log(`Loaded ${participants?.length || 0} participants from Supabase`);

    return (participants || []).map((p: any) => ({
      id: p.id,
      signature: p.signature,
      agreedAt: p.agreed_at,
      agreements: p.agreements,
      hasSessionData: (p.sessions?.length || 0) > 0,
      hasVideoFiles: (p.video_files?.length || 0) > 0,
      videoFiles: p.video_files || []
    }));
  } catch (error) {
    console.error('Error loading all participants:', error);
    return [];
  }
}

// Load all session data
export async function loadAllSessionData(): Promise<Array<{ participantId: string; sessionData: SessionData }>> {
  try {
    // 新しいスキーマではparticipant_experiment_sessionsテーブルを使用
    const { data: sessions, error } = await supabase
      .from('participant_experiment_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading session data from Supabase:', error);
      return [];
    }

    console.log(`Loaded ${sessions?.length || 0} sessions from Supabase`);

    return (sessions || []).map((session: any) => ({
      participantId: session.participant_id,
      sessionData: {
        events: [], // participant_experiment_sessionsにはイベントデータがない
        createdAt: session.created_at,
        sessionId: session.session_id,
        sessionType: session.session_type,
        startTime: session.start_time,
        endTime: session.end_time,
      } as SessionData
    }));
  } catch (error) {
    console.error('Error loading all session data:', error);
    return [];
  }
}

// Get participant statistics
export function getParticipantStatistics(participants: Participant[]) {
  const totalParticipants = participants.length;
  const participantsWithSessionData = participants.filter(p => p.hasSessionData).length;
  const participantsWithVideo = participants.filter(p => p.hasVideoFiles).length;

  const completionRate = totalParticipants > 0 ? (participantsWithSessionData / totalParticipants) * 100 : 0;

  return {
    totalParticipants,
    participantsWithSessionData,
    participantsWithVideo,
    completionRate: Math.round(completionRate * 100) / 100
  };
}
