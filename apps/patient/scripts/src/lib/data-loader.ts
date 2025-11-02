import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

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
    const { supabaseManager } = await import('./database/supabase-manager.js');
    await supabaseManager.initialize();
    console.log('Supabase database connection established');
  } catch (error) {
    console.error('Failed to initialize Supabase database:', error);
    throw error;
  }
}

// 後方互換性のため
export async function initializeNeo4jDatabase(): Promise<void> {
  return initializeSupabaseDatabase();
}


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
  agreements: Record<string, any>;
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
            const { supabaseManager } = await import('./database/supabase-manager.js');
            const participant = {
              id: data.participantId,
              signature: data.signature,
              agreedAt: new Date(data.agreedAt || new Date()),
              agreements: data.agreements || {},
              hasSessionData: false,
              hasVideoFiles: false,
              videoFiles: []
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
      const { supabaseManager } = await import('./database/supabase-manager.js');
      const participant = {
        id: data.participantId,
        signature: data.signature,
        agreedAt: new Date(data.agreedAt || new Date()),
        agreements: data.agreements || {},
        hasSessionData: false,
        hasVideoFiles: false,
        videoFiles: []
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
      agreements: consentData.agreements || {},
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
    // Supabaseデータベースからセッションデータを取得
    try {
      const { getSupabaseClient } = await import('./database/supabase-client.js');
      const client = getSupabaseClient();

      // participant_experiment_sessionsからセッションデータを取得
      // 注意: eventsは現在Supabaseスキーマに保存されていないため、ファイルシステムから読み込む必要がある
      const { data: sessions, error } = await client
        .from('participant_experiment_sessions')
        .select('*')
        .eq('participant_id', participantId)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (sessions && sessions.length > 0) {
        // セッションデータのeventsはファイルシステムから読み込む必要がある
        // ここでは空の配列を返す（実際の実装ではファイルシステムから読み込む）
        return {
          participantId,
          events: [],
          wordResponses: [] // TODO: Implement word responses extraction
        };
      }

      console.log(`No session data found in Supabase for ${participantId}`);
      return null;
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
      const wordKey = String(word);
      if (!wordEvents[wordKey]) {
        wordEvents[wordKey] = [];
      }
      wordEvents[wordKey].push(event);
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
    const { supabaseManager } = await import('./database/supabase-manager.js');
    const supabaseParticipants = await supabaseManager.getAllParticipants();

    console.log(`Loaded ${supabaseParticipants?.length || 0} participants from Supabase`);

    // Convert to data-loader Participant format
    const participants: Participant[] = supabaseParticipants.map(p => ({
      id: p.id,
      signature: p.signature || "unknown",
      agreedAt: p.agreedAt || new Date(),
      agreements: p.agreements || {},
      hasSessionData: p.hasSessionData || false,
      hasVideoFiles: p.hasVideoFiles || false,
      videoFiles: p.videoFiles || []
    }));

    return participants;
  } catch (error) {
    console.error('Error loading all participants:', error);
    return [];
  }
}

// Load all session data
export async function loadAllSessionData(): Promise<Array<{ participantId: string; sessionData: SessionData }>> {
  try {
    const { getSupabaseClient } = await import('./database/supabase-client.js');
    const client = getSupabaseClient();

    // Supabaseからセッションデータを取得
    const { data: sessions, error } = await client
      .from('participant_experiment_sessions')
      .select('participant_id, *')
      .order('start_time', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`Loaded ${sessions?.length || 0} sessions from Supabase`);

    return (sessions || []).map((session: any) => ({
      participantId: session.participant_id,
      sessionData: {
        participantId: session.participant_id,
        events: [], // eventsは現在Supabaseスキーマに保存されていない
        wordResponses: [] // TODO: Implement word responses extraction
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
