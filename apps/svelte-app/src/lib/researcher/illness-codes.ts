// ICD-10 Based Illnesses
// Used for suggest input in the consent form

export interface IllnessCode {
  code: string;
  name_en: string;
  name_ja: string;
}

export const ILLNESS_CODES: IllnessCode[] = [
  { code: "F00", name_en: "Dementia in Alzheimer disease", name_ja: "アルツハイマー病の認知症" },
  { code: "F01", name_en: "Vascular dementia", name_ja: "血管性認知症" },
  { code: "F03", name_en: "Unspecified dementia", name_ja: "詳細不明の認知症" },
  { code: "F10", name_en: "Mental and behavioural disorders due to use of alcohol", name_ja: "アルコール使用による精神および行動の障害" },
  { code: "F20", name_en: "Schizophrenia", name_ja: "統合失調症" },
  { code: "F21", name_en: "Schizotypal disorder", name_ja: "統合失調症型障害" },
  { code: "F22", name_en: "Delusional disorders", name_ja: "妄想性障害" },
  { code: "F23", name_en: "Acute and transient psychotic disorders", name_ja: "急性一過性精神病性障害" },
  { code: "F25", name_en: "Schizoaffective disorders", name_ja: "統合失調感情障害" },
  { code: "F30", name_en: "Manic episode", name_ja: "躁病エピソード" },
  { code: "F31", name_en: "Bipolar affective disorder", name_ja: "双極性感情障害（躁うつ病）" },
  { code: "F32", name_en: "Depressive episode", name_ja: "うつ病エピソード" },
  { code: "F33", name_en: "Recurrent depressive disorder", name_ja: "反復性うつ病性障害" },
  { code: "F34", name_en: "Persistent mood [affective] disorders", name_ja: "持続性気分［感情］障害" },
  { code: "F40", name_en: "Phobic anxiety disorders", name_ja: "恐怖症性不安障害" },
  { code: "F41", name_en: "Other anxiety disorders", name_ja: "その他の不安障害（パニック障害、全般性不安障害など）" },
  { code: "F42", name_en: "Obsessive-compulsive disorder", name_ja: "強迫性障害" },
  { code: "F43", name_en: "Reaction to severe stress, and adjustment disorders", name_ja: "重度ストレスへの反応および適応障害（PTSDなど）" },
  { code: "F44", name_en: "Dissociative [conversion] disorders", name_ja: "解離性［転換性］障害" },
  { code: "F45", name_en: "Somatoform disorders", name_ja: "身体表現性障害" },
  { code: "F48", name_en: "Other neurotic disorders", name_ja: "その他の神経症性障害" },
  { code: "F50", name_en: "Eating disorders", name_ja: "摂食障害" },
  { code: "F51", name_en: "Nonorganic sleep disorders", name_ja: "非有機性睡眠障害" },
  { code: "F60", name_en: "Specific personality disorders", name_ja: "特定のパーソナリティ障害" },
  { code: "F70", name_en: "Mild mental retardation", name_ja: "軽度知的障害" },
  { code: "F80", name_en: "Specific developmental disorders of speech and language", name_ja: "会話および言語の特異的発達障害" },
  { code: "F81", name_en: "Specific developmental disorders of scholastic skills", name_ja: "学習能力の特異的発達障害" },
  { code: "F84", name_en: "Pervasive developmental disorders", name_ja: "広汎性発達障害（自閉症、アスペルガー症候群など）" },
  { code: "F90", name_en: "Hyperkinetic disorders", name_ja: "多動性障害（ADHDなど）" },
  { code: "F91", name_en: "Conduct disorders", name_ja: "素行障害" },
  { code: "F95", name_en: "Tic disorders", name_ja: "チック障害" },
  { code: "None", name_en: "None", name_ja: "なし" }
];

