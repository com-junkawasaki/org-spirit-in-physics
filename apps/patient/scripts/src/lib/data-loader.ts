import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { arangodb } from './neo4j';

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

// Neo4j初期化関数
export async function initializeNeo4jDatabase(): Promise<void> {
  try {
    // Neo4j接続テスト
    await arangodb.query('RETURN 1');

    console.log('Neo4j database connection established');
  } catch (error) {
    console.error('Failed to initialize Neo4j database:', error);
    throw error;
  }
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

          // Neo4jにも保存
          for (const data of consentData) {
            const { neo4jManager } = await import('./database/neo4j-manager.ts');
            const participant: Participant = {
              id: data.participantId,
              signature: data.signature,
              agreedAt: new Date(data.agreedAt || new Date()),
              agreements: data.agreements || {},
              hasSessionData: false,
              hasVideoFiles: false,
              videoFiles: []
            };

            try {
              await neo4jManager.saveParticipant(participant);
            } catch (saveError) {
              console.warn('Failed to save participant to Neo4j:', saveError);
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

    // Neo4jにも保存
    for (const data of consentData) {
      const { neo4jManager } = await import('./database/neo4j-manager.ts');
      const participant: Participant = {
        id: data.participantId,
        signature: data.signature,
        agreedAt: new Date(data.agreedAt || new Date()),
        agreements: data.agreements || {},
        hasSessionData: false,
        hasVideoFiles: false,
        videoFiles: []
      };

      try {
        await neo4jManager.saveParticipant(participant);
      } catch (saveError) {
        console.warn('Failed to save participant to Neo4j:', saveError);
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
    // Neo4jデータベースからセッションデータを取得（一本化）
    try {
      const { neo4jManager } = await import('./database/neo4j-manager.ts');

      // Neo4jからセッションデータを取得
      const query = `
        MATCH (p:Participant {id: $participantId})-[:HAS_SESSION]->(s:Session)
        RETURN s
        ORDER BY s.created_at DESC
      `;
      const sessions = await neo4jManager.executeQuery(query, { participantId });

      if (sessions && sessions.length > 0) {
        const session = sessions[0].s;
        return {
          participantId,
          events: session.events || [],
          wordResponses: [] // TODO: Implement word responses extraction
        };
      }

      console.log(`No session data found in Neo4j for ${participantId}`);
      return null;
    } catch (neo4jError) {
      console.warn('Failed to load session data from Neo4j:', neo4jError);
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
    const { neo4jManager } = await import('./database/neo4j-manager.ts');
    const neo4jParticipants = await neo4jManager.getAllParticipants();

    console.log(`Loaded ${neo4jParticipants?.length || 0} participants from Neo4j`);

    // Convert to data-loader Participant format
    const participants: Participant[] = neo4jParticipants.map(p => ({
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
    const { neo4jManager } = await import('./database/neo4j-manager.ts');

    // Neo4jからセッションデータを取得
    const query = `
      MATCH (p:Participant)-[:HAS_SESSION]->(s:Session)
      RETURN p.id as participant_id, s
      ORDER BY p.id, s.created_at DESC
    `;
    const sessions = await neo4jManager.executeQuery(query);

    console.log(`Loaded ${sessions?.length || 0} sessions from Neo4j`);

    return (sessions || []).map((record: any) => ({
      participantId: record.participant_id,
      sessionData: {
        participantId: record.participant_id,
        events: record.s.events || [],
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
