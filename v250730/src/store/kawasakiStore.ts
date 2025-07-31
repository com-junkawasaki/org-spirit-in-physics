import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Word, KawasakiStore, KawasakiStoreState, WordResponse } from '@/components/jung-voice-assessment/types';

const JUNG_WORDS: Word[] = [
    { word: "頭", key: "1" }, { word: "緑", key: "2" }, { word: "水", key: "3" }, { word: "歌う", key: "4" }, { word: "死", key: "5" }, 
    { word: "長い", key: "6" }, { word: "船", key: "7" }, { word: "尋ねる", key: "8" }, { word: "窓", key: "9" }, { word: "親切", key: "10" },
    { word: "ランプ", key: "11" }, { word: " 富", key: "12" }, { word: "木", key: "13" }, { word: "刺す", key: "14" }, { word: "気の毒", key: "15" },
    { word: "踊る", key: "16" }, { word: "村", key: "17" }, { word: "湖", key: "18" }, { word: "病気", key: "19" }, { word: "誇り", key: "20" },
    { word: "料理する", key: "21" }, { word: "インク", key: "22" }, { word: "悪い", key: "23" }, { word: "針", key: "24" }, { word: "泳ぐ", key: "25" },
    { word: "旅行", key: "26" }, { word: "青", key: "27" }, { word: "パン", key: "28" }, { word: "脅かす", key: "29" }, { word: "ペン", key: "30" },
    { word: "人", key: "31" }, { word: "支払う", key: "32" }, { word: "愚かな", key: "33" }, { word: "本", key: "34" }, { word: "見下す", key: "35" },
    { word: "指", key: "36" }, { word: "高価な", key: "37" }, { word: "鳥", key: "38" }, { word: "歩く", key: "39" }, { word: "紙", key: "40" },
    { word: "邪悪な", key: "41" }, { word: "蛙", key: "42" }, { word: "試す", key: "43" }, { word: "空腹", key: "44" }, { word: "白い", key: "45" },
    { word: "子供", key: "46" }, { word: "気遣う", key: "47" }, { word: "鉛筆", key: "48" }, { word: "悲しい", key: "49" }, { word: "プラム", key: "50" },
    { word: "結婚する", key: "51" }, { word: "家", key: "52" }, { word: "口論する", key: "53" }, { word: "ガラス", key: "54" }, { word: "正しい", key: "55" },
    { word: "乗る", key: "56" }, { word: "茎", key: "57" }, { word: "運", key: "58" }, { word: "待つ", key: "59" }, { word: "大きい", key: "60" },
    { word: "オオカミ", key: "61" }, { word: "習慣", key: "62" }, { word: "祈る", key: "63" }, { word: "お金", key: "64" }, { word: "馬鹿", key: "65" },
    { word: "許す", key: "66" }, { word: "山", key: "67" }, { word: "働く", key: "68" }, { word: "バター", key: "69" }, { word: "正義", key: "70" },
    { word: "牛", key: "71" }, { word: "きれい", key: "72" }, { word: "洗う", key: "73" }, { word: "黄色", key: "74" }, { word: "嘘", key: "75" },
    { word: "優しさ", key: "76" }, { word: "女", key: "77" }, { word: "ためらう", key: "78" }, { word: "運転する", key: "79" }, { word: "塩", key: "80" },
    { word: "状態", key: "81" }, { word: "愛する", key: "82" }, { word: "不安", key: "83" }, { word: "花", key: "84" }, { word: "殴る", key: "85" },
    { word: "箱", key: "86" }, { word: "古い", key: "87" }, { word: "家族", key: "88" }, { word: "分離する", key: "89" }, { word: "汚い", key: "90" },
    { word: "来る", key: "91" }, { word: "変化", key: "92" }, { word: "豚", key: "93" }, { word: "見つける", key: "94" }, { word: "リンゴ", key: "95" },
    { word: "友人", key: "96" }, { word: "偶然", key: "97" }, { word: "忘れる", key: "98" }, { word: "苦しむ", key: "99" }, { word: "死体", key: "100" }
];

const initialState: KawasakiStoreState = {
  testStatus: 'idle',
  deviceStatus: 'idle',
  stream: null,
  error: null,
  stimulusWords: [],
  currentSession: 1,
  currentWordIndex: -1,
  wordResponses: [],
  mediaStatus: 'idle',
  events: [],
  sessionVideoUrl: null,
  participantId: null,
};

export const useKawasakiStore = create<KawasakiStore>()(
  immer((set, get) => ({
    ...initialState,

    initializeParticipant: () => {
        const participantId = uuidv4();
        set({ participantId });
        get().logEvent('participant_initialized', { participantId });
    },
    
    startPreflight: () => {
        set({ testStatus: 'preflight', deviceStatus: 'pending' });
        get().logEvent('preflight_started');
    },

    setDeviceStatus: (status) => set({ deviceStatus: status }),
    setStream: (stream) => set({ stream }),
    setError: (error) => set({ error }),
    setMediaStatus: (status) => set({ mediaStatus: status }),

    logEvent: (type, payload = {}) => {
        set(state => {
            state.events.push({ timestamp: Date.now(), type, payload });
        });
    },

    startSession: (numberOfWords) => {
        const sessionNumber = get().currentSession === 1 ? 1 : 2;
        const shuffledWords = JUNG_WORDS.sort(() => 0.5 - Math.random()).slice(0, numberOfWords);

        set({
            testStatus: sessionNumber === 1 ? 'session-1-running' : 'session-2-running',
            stimulusWords: shuffledWords,
            currentWordIndex: 0,
        });
        get().logEvent('session_started', { session: get().currentSession, numberOfWords });
    },

    completeSession: () => {
        const currentSession = get().currentSession;
        if (currentSession === 1) {
            set({ testStatus: 'session-1-complete', currentWordIndex: -1, currentSession: 2 });
            get().logEvent('session_1_completed');
        } else {
            set({ testStatus: 'completed' });
            get().logEvent('session_2_completed');
            get().logEvent('test_completed');
        }
    },
    
    advanceToNextWord: () => {
        const { currentWordIndex, stimulusWords, completeSession } = get();
        if (currentWordIndex + 1 >= stimulusWords.length) {
            completeSession();
        } else {
            set(state => {
                state.currentWordIndex += 1;
            });
        }
    },

    recordWordResponse: ({ responseWord, reactionTimeMs, audioBlob }) => {
        const { currentWordIndex, stimulusWords, advanceToNextWord, logEvent } = get();
        const stimulusWord = stimulusWords[currentWordIndex];

        const response: WordResponse = {
            stimulusWord,
            responseWord,
            reactionTimeMs,
            audioBlob,
        };
        
        set(state => {
            state.wordResponses.push(response);
        });

        logEvent('word_response_recorded', {
            stimulus: stimulusWord.word,
            response: responseWord,
            reactionTime: reactionTimeMs,
        });
        
        advanceToNextWord();
    },

    resetTest: () => {
        set(initialState);
        get().logEvent('test_reset');
    },

    saveSessionVideo: (session, blob) => {
        // This is a placeholder for saving video.
        // In a real app, you'd upload this to a server.
        const url = URL.createObjectURL(blob);
        set({ sessionVideoUrl: url });
        get().logEvent(`session_${session}_video_saved`, { url });
    },
  }))
);
