
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct StimulusWord {
    pub japanese: &'static str,
    pub english: &'static str,
    pub pronunciation: &'static str,
}

lazy_static::lazy_static! {
    pub static ref JUNG_STIMULUS_WORDS: HashMap<u32, StimulusWord> = {
        let mut m = HashMap::new();
        m.insert(1, StimulusWord { japanese: "頭", english: "head", pronunciation: "あたま" });
        m.insert(2, StimulusWord { japanese: "緑", english: "green", pronunciation: "みどり" });
        m.insert(3, StimulusWord { japanese: "水", english: "water", pronunciation: "みず" });
        m.insert(4, StimulusWord { japanese: "歌う", english: "to sing", pronunciation: "うたう" });
        m.insert(5, StimulusWord { japanese: "亡くなる", english: "death", pronunciation: "なくなる" });
        m.insert(6, StimulusWord { japanese: "長い", english: "long", pronunciation: "ながい" });
        m.insert(7, StimulusWord { japanese: "船", english: "ship", pronunciation: "ふね" });
        m.insert(8, StimulusWord { japanese: "支払い", english: "to pay", pronunciation: "しはらい" });
        m.insert(9, StimulusWord { japanese: "窓", english: "window", pronunciation: "まど" });
        m.insert(10, StimulusWord { japanese: "親切な", english: "friendly", pronunciation: "しんせつ" });
        m.insert(11, StimulusWord { japanese: "机", english: "table", pronunciation: "つくえ" });
        m.insert(12, StimulusWord { japanese: "聞く", english: "to ask", pronunciation: "きく" });
        m.insert(13, StimulusWord { japanese: "村", english: "village", pronunciation: "むら" });
        m.insert(14, StimulusWord { japanese: "冷たい", english: "cold", pronunciation: "つめたい" });
        m.insert(15, StimulusWord { japanese: "茎", english: "stem", pronunciation: "きく" });
        m.insert(16, StimulusWord { japanese: "踊る", english: "to dance", pronunciation: "おどる" });
        m.insert(17, StimulusWord { japanese: "海", english: "lake", pronunciation: "うみ" });
        m.insert(18, StimulusWord { japanese: "病気", english: "sick", pronunciation: "びょうき" });
        m.insert(19, StimulusWord { japanese: "プライド", english: "pride", pronunciation: "プライド" });
        m.insert(20, StimulusWord { japanese: "料理", english: "to cook", pronunciation: "りょうり" });
        m.insert(21, StimulusWord { japanese: "インク", english: "ink", pronunciation: "インク" });
        m.insert(22, StimulusWord { japanese: "怒り", english: "angry", pronunciation: "いかり" });
        m.insert(23, StimulusWord { japanese: "針", english: "needle", pronunciation: "はり" });
        m.insert(24, StimulusWord { japanese: "泳ぐ", english: "to swim", pronunciation: "およぐ" });
        m.insert(25, StimulusWord { japanese: "旅行", english: "journey", pronunciation: "りょこう" });
        m.insert(26, StimulusWord { japanese: "青い", english: "blue", pronunciation: "あおい" });
        m.insert(27, StimulusWord { japanese: "電気", english: "lamp", pronunciation: "でんき" });
        m.insert(28, StimulusWord { japanese: "罪", english: "to sin", pronunciation: "つみ" });
        m.insert(29, StimulusWord { japanese: "ご飯", english: "bread", pronunciation: "ごはん" });
        m.insert(30, StimulusWord { japanese: "金持ち", english: "rich", pronunciation: "かねもち" });
        m.insert(31, StimulusWord { japanese: "木", english: "tree", pronunciation: "き" });
        m.insert(32, StimulusWord { japanese: "刺す", english: "to prick", pronunciation: "さす" });
        m.insert(33, StimulusWord { japanese: "同情", english: "pity", pronunciation: "どうじょう" });
        m.insert(34, StimulusWord { japanese: "黄色", english: "yellow", pronunciation: "きいろ" });
        m.insert(35, StimulusWord { japanese: "山", english: "mountain", pronunciation: "やま" });
        m.insert(36, StimulusWord { japanese: "死ぬ", english: "to die", pronunciation: "しぬ" });
        m.insert(37, StimulusWord { japanese: "塩", english: "salt", pronunciation: "しお" });
        m.insert(38, StimulusWord { japanese: "新しい", english: "new", pronunciation: "あたらしい" });
        m.insert(39, StimulusWord { japanese: "癖", english: "custom", pronunciation: "くせ" });
        m.insert(40, StimulusWord { japanese: "祈る", english: "to pray", pronunciation: "いのる" });
        m.insert(41, StimulusWord { japanese: "お金", english: "money", pronunciation: "おかね" });
        m.insert(42, StimulusWord { japanese: "馬鹿", english: "stupid", pronunciation: "ばか" });
        m.insert(43, StimulusWord { japanese: "ノート", english: "exercise-book", pronunciation: "ノート" });
        m.insert(44, StimulusWord { japanese: "軽蔑", english: "to despise", pronunciation: "けいべつ" });
        m.insert(45, StimulusWord { japanese: "指", english: "finger", pronunciation: "ゆび" });
        m.insert(46, StimulusWord { japanese: "高価な", english: "dear", pronunciation: "こうかな" });
        m.insert(47, StimulusWord { japanese: "鳥", english: "bird", pronunciation: "とり" });
        m.insert(48, StimulusWord { japanese: "落ちる", english: "to fall", pronunciation: "おちる" });
        m.insert(49, StimulusWord { japanese: "本", english: "book", pronunciation: "ほん" });
        m.insert(50, StimulusWord { japanese: "不正", english: "unjust", pronunciation: "ふせい" });
        m.insert(51, StimulusWord { japanese: "蛙", english: "frog", pronunciation: "かえる" });
        m.insert(52, StimulusWord { japanese: "別れる", english: "to part", pronunciation: "わかれる" });
        m.insert(53, StimulusWord { japanese: "空腹", english: "hunger", pronunciation: "くうふく" });
        m.insert(54, StimulusWord { japanese: "白い", english: "white", pronunciation: "しろい" });
        m.insert(55, StimulusWord { japanese: "子供", english: "child", pronunciation: "こども" });
        m.insert(56, StimulusWord { japanese: "注意", english: "to pay attention", pronunciation: "ちゅうい" });
        m.insert(57, StimulusWord { japanese: "鉛筆", english: "pencil", pronunciation: "えんぴつ" });
        m.insert(58, StimulusWord { japanese: "悲しい", english: "sad", pronunciation: "かなしい" });
        m.insert(59, StimulusWord { japanese: "りんご", english: "plum", pronunciation: "りんご" });
        m.insert(60, StimulusWord { japanese: "結婚", english: "to marry", pronunciation: "けっこん" });
        m.insert(61, StimulusWord { japanese: "家", english: "house", pronunciation: "いえ" });
        m.insert(62, StimulusWord { japanese: "かわいい", english: "darling", pronunciation: "かわいい" });
        m.insert(63, StimulusWord { japanese: "ガラス", english: "glass", pronunciation: "ガラス" });
        m.insert(64, StimulusWord { japanese: "争う", english: "to quarrel", pronunciation: "あらそう" });
        m.insert(65, StimulusWord { japanese: "毛皮", english: "fur", pronunciation: "けがわ" });
        m.insert(66, StimulusWord { japanese: "大きい", english: "big", pronunciation: "おおきい" });
        m.insert(67, StimulusWord { japanese: "人参", english: "carrot", pronunciation: "にんじん" });
        m.insert(68, StimulusWord { japanese: "塗る", english: "to paint", pronunciation: "ぬる" });
        m.insert(69, StimulusWord { japanese: "部分", english: "part", pronunciation: "ぶぶん" });
        m.insert(70, StimulusWord { japanese: "古い", english: "old", pronunciation: "ふるい" });
        m.insert(71, StimulusWord { japanese: "花", english: "flower", pronunciation: "はな" });
        m.insert(72, StimulusWord { japanese: "打つ", english: "to beat", pronunciation: "うつ" });
        m.insert(73, StimulusWord { japanese: "箱", english: "box", pronunciation: "はこ" });
        m.insert(74, StimulusWord { japanese: "荒い", english: "wild", pronunciation: "あらい" });
        m.insert(75, StimulusWord { japanese: "家族", english: "family", pronunciation: "かぞく" });
        m.insert(76, StimulusWord { japanese: "洗う", english: "to wash", pronunciation: "あらう" });
        m.insert(77, StimulusWord { japanese: "牛", english: "cow", pronunciation: "うし" });
        m.insert(78, StimulusWord { japanese: "変", english: "friend （誤訳？）", pronunciation: "へん" });
        m.insert(79, StimulusWord { japanese: "幸運", english: "happiness", pronunciation: "こううん" });
        m.insert(80, StimulusWord { japanese: "嘘", english: "lie", pronunciation: "うそ" });
        m.insert(81, StimulusWord { japanese: "礼儀", english: "deportment", pronunciation: "れいぎ" });
        m.insert(82, StimulusWord { japanese: "狭い", english: "narrow", pronunciation: "せまい" });
        m.insert(83, StimulusWord { japanese: "兄弟", english: "brother", pronunciation: "きょうだい" });
        m.insert(84, StimulusWord { japanese: "怖がる", english: "to fear", pronunciation: "こわがる" });
        m.insert(85, StimulusWord { japanese: "コウノトリ", english: "stork", pronunciation: "こうのとり" });
        m.insert(86, StimulusWord { japanese: "間違い", english: "FALSE", pronunciation: "まちがい" });
        m.insert(87, StimulusWord { japanese: "心配", english: "anxiety", pronunciation: "しんぱい" });
        m.insert(88, StimulusWord { japanese: "キス", english: "to kiss", pronunciation: "キス" });
        m.insert(89, StimulusWord { japanese: "花嫁", english: "bride", pronunciation: "はなよめ" });
        m.insert(90, StimulusWord { japanese: "純粋な", english: "pure", pronunciation: "じゅんすいな" });
        m.insert(91, StimulusWord { japanese: "ドア", english: "door", pronunciation: "ドア" });
        m.insert(92, StimulusWord { japanese: "選ぶ", english: "to choose", pronunciation: "えらぶ" });
        m.insert(93, StimulusWord { japanese: "干し草", english: "hay", pronunciation: "ほしくさ" });
        m.insert(94, StimulusWord { japanese: "嬉しい", english: "contented", pronunciation: "うれしい" });
        m.insert(95, StimulusWord { japanese: "虐める", english: "ridicule", pronunciation: "いじめる" });
        m.insert(96, StimulusWord { japanese: "眠る", english: "to sleep", pronunciation: "ねむる" });
        m.insert(97, StimulusWord { japanese: "年月", english: "month", pronunciation: "ねんげつ" });
        m.insert(98, StimulusWord { japanese: "きれいな", english: "nice", pronunciation: "きれいな" });
        m.insert(99, StimulusWord { japanese: "女", english: "woman", pronunciation: "おんな" });
        m.insert(100, StimulusWord { japanese: "侮辱", english: "to abuse", pronunciation: "ぶじょく" });
        m
    };
}

pub const JUNG_TEST_WELCOME_MESSAGE: &str = "ユングの言語連想検査へようこそ。この検査は、あなたの「言葉」に対する心理的な連想を探るものです。私が単語を提示しますので、最初に思いついた単語で応答してください。１つの単語に対して、2秒以内を目安に回答してください。回答があった時点で次の単語が提示されます。10秒が過ぎた場合は次の単語が提示されます。セッションは２回行われ、一回のセッションで単語は100個提示されます。";
