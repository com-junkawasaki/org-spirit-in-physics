-- Merkle DAG: create_stimulus_words_table
-- Create stimulus_words table for Jung word association test

CREATE TABLE IF NOT EXISTS stimulus_words (
    id INTEGER PRIMARY KEY,
    japanese TEXT NOT NULL,
    english TEXT NOT NULL,
    pronunciation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT stimulus_words_id_check CHECK (id >= 1 AND id <= 100)
);

CREATE INDEX IF NOT EXISTS idx_stimulus_words_id ON stimulus_words(id);

-- Insert the 100 Jung stimulus words
INSERT INTO stimulus_words (id, japanese, english, pronunciation) VALUES
(1, '頭', 'head', 'あたま'),
(2, '緑', 'green', 'みどり'),
(3, '水', 'water', 'みず'),
(4, '歌う', 'to sing', 'うたう'),
(5, '亡くなる', 'death', 'なくなる'),
(6, '長い', 'long', 'ながい'),
(7, '船', 'ship', 'ふね'),
(8, '支払い', 'to pay', 'しはらい'),
(9, '窓', 'window', 'まど'),
(10, '親切な', 'friendly', 'しんせつ'),
(11, '机', 'table', 'つくえ'),
(12, '聞く', 'to ask', 'きく'),
(13, '村', 'village', 'むら'),
(14, '冷たい', 'cold', 'つめたい'),
(15, '茎', 'stem', 'きく'),
(16, '踊る', 'to dance', 'おどる'),
(17, '海', 'lake', 'うみ'),
(18, '病気', 'sick', 'びょうき'),
(19, 'プライド', 'pride', 'プライド'),
(20, '料理', 'to cook', 'りょうり'),
(21, 'インク', 'ink', 'インク'),
(22, '怒り', 'angry', 'いかり'),
(23, '針', 'needle', 'はり'),
(24, '泳ぐ', 'to swim', 'およぐ'),
(25, '旅行', 'journey', 'りょこう'),
(26, '青い', 'blue', 'あおい'),
(27, '電気', 'lamp', 'でんき'),
(28, '罪', 'to sin', 'つみ'),
(29, 'ご飯', 'bread', 'ごはん'),
(30, '金持ち', 'rich', 'かねもち'),
(31, '木', 'tree', 'き'),
(32, '刺す', 'to prick', 'さす'),
(33, '同情', 'pity', 'どうじょう'),
(34, '黄色', 'yellow', 'きいろ'),
(35, '山', 'mountain', 'やま'),
(36, '死ぬ', 'to die', 'しぬ'),
(37, '塩', 'salt', 'しお'),
(38, '新しい', 'new', 'あたらしい'),
(39, '癖', 'custom', 'くせ'),
(40, '祈る', 'to pray', 'いのる'),
(41, 'お金', 'money', 'おかね'),
(42, '馬鹿', 'stupid', 'ばか'),
(43, 'ノート', 'exercise-book', 'ノート'),
(44, '軽蔑', 'to despise', 'けいべつ'),
(45, '指', 'finger', 'ゆび'),
(46, '高価な', 'dear', 'こうかな'),
(47, '鳥', 'bird', 'とり'),
(48, '落ちる', 'to fall', 'おちる'),
(49, '本', 'book', 'ほん'),
(50, '不正', 'unjust', 'ふせい'),
(51, '蛙', 'frog', 'かえる'),
(52, '別れる', 'to part', 'わかれる'),
(53, '空腹', 'hunger', 'くうふく'),
(54, '白い', 'white', 'しろい'),
(55, '子供', 'child', 'こども'),
(56, '注意', 'to pay attention', 'ちゅうい'),
(57, '鉛筆', 'pencil', 'えんぴつ'),
(58, '悲しい', 'sad', 'かなしい'),
(59, 'りんご', 'plum', 'りんご'),
(60, '結婚', 'to marry', 'けっこん'),
(61, '家', 'house', 'いえ'),
(62, 'かわいい', 'darling', 'かわいい'),
(63, 'ガラス', 'glass', 'ガラス'),
(64, '争う', 'to quarrel', 'あらそう'),
(65, '毛皮', 'fur', 'けがわ'),
(66, '大きい', 'big', 'おおきい'),
(67, '人参', 'carrot', 'にんじん'),
(68, '塗る', 'to paint', 'ぬる'),
(69, '部分', 'part', 'ぶぶん'),
(70, '古い', 'old', 'ふるい'),
(71, '花', 'flower', 'はな'),
(72, '打つ', 'to beat', 'うつ'),
(73, '箱', 'box', 'はこ'),
(74, '荒い', 'wild', 'あらい'),
(75, '家族', 'family', 'かぞく'),
(76, '洗う', 'to wash', 'あらう'),
(77, '牛', 'cow', 'うし'),
(78, '変', 'friend （誤訳？）', 'へん'),
(79, '幸運', 'happiness', 'こううん'),
(80, '嘘', 'lie', 'うそ'),
(81, '礼儀', 'deportment', 'れいぎ'),
(82, '狭い', 'narrow', 'せまい'),
(83, '兄弟', 'brother', 'きょうだい'),
(84, '怖がる', 'to fear', 'こわがる'),
(85, 'コウノトリ', 'stork', 'こうのとり'),
(86, '間違い', 'FALSE', 'まちがい'),
(87, '心配', 'anxiety', 'しんぱい'),
(88, 'キス', 'to kiss', 'キス'),
(89, '花嫁', 'bride', 'はなよめ'),
(90, '純粋な', 'pure', 'じゅんすいな'),
(91, 'ドア', 'door', 'ドア'),
(92, '選ぶ', 'to choose', 'えらぶ'),
(93, '干し草', 'hay', 'ほしくさ'),
(94, '嬉しい', 'contented', 'うれしい'),
(95, '虐める', 'ridicule', 'いじめる'),
(96, '眠る', 'to sleep', 'ねむる'),
(97, '年月', 'month', 'ねんげつ'),
(98, 'きれいな', 'nice', 'きれいな'),
(99, '女', 'woman', 'おんな'),
(100, '侮辱', 'to abuse', 'ぶじょく')
ON CONFLICT (id) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_stimulus_words_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stimulus_words_updated_at
    BEFORE UPDATE ON stimulus_words
    FOR EACH ROW
    EXECUTE FUNCTION update_stimulus_words_updated_at();

