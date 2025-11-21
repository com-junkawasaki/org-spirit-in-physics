-- Merkle DAG: register_hume_emotions -> emotion_names_with_colors
-- Hume AIの感情タイプをemotion_namesテーブルに登録し、色情報も追加

-- 1. emotion_namesテーブルにcolorカラムを追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'emotion_names' 
        AND column_name = 'color'
    ) THEN
        ALTER TABLE emotion_names ADD COLUMN color TEXT; -- HEX color code (e.g., '#FFD700')
        RAISE NOTICE 'color column added to emotion_names table';
    END IF;
END $$;

-- 2. Hume AIの感情タイプを登録（Hume Expression Measurement APIから抽出）
-- 画像の説明とコードベースから取得した感情タイプの完全なリスト
INSERT INTO emotion_names (name, category, color, description) VALUES
-- Basic emotions (基本感情)
('Admiration', 'general', '#FF69B4', 'Admiration emotion - Pink'),
('Adoration', 'general', '#FFB6C1', 'Adoration emotion - Light Pink'),
('Aesthetic Appreciation', 'general', '#DDA0DD', 'Aesthetic Appreciation emotion - Plum'),
('Amusement', 'general', '#FFD700', 'Amusement emotion - Gold'),
('Anger', 'general', '#DC143C', 'Anger emotion - Crimson Red'),
('Anxiety', 'general', '#9370DB', 'Anxiety emotion - Medium Purple'),
('Awe', 'general', '#4169E1', 'Awe emotion - Royal Blue'),
('Awkwardness', 'general', '#D3D3D3', 'Awkwardness emotion - Light Gray'),
('Boredom', 'general', '#808080', 'Boredom emotion - Gray'),
('Calmness', 'general', '#87CEEB', 'Calmness emotion - Sky Blue'),
('Concentration', 'general', '#4682B4', 'Concentration emotion - Steel Blue'),
('Contemplation', 'general', '#6495ED', 'Contemplation emotion - Cornflower Blue'),
('Confusion', 'general', '#A9A9A9', 'Confusion emotion - Dark Gray'),
('Contempt', 'general', '#8B4513', 'Contempt emotion - Saddle Brown'),
('Contentment', 'general', '#FFE4B5', 'Contentment emotion - Moccasin'),
('Craving', 'general', '#FF6347', 'Craving emotion - Tomato'),
('Determination', 'general', '#FF8C00', 'Determination emotion - Dark Orange'),
('Disappointment', 'general', '#708090', 'Disappointment emotion - Slate Gray'),
('Disgust', 'general', '#8B4513', 'Disgust emotion - Saddle Brown'),
('Distress', 'general', '#2F4F4F', 'Distress emotion - Dark Slate Gray'),
('Doubt', 'general', '#C0C0C0', 'Doubt emotion - Silver'),
('Ecstasy', 'general', '#FFD700', 'Ecstasy emotion - Gold'),
('Embarrassment', 'general', '#FFB6C1', 'Embarrassment emotion - Light Pink'),
('Empathic Pain', 'general', '#8B0000', 'Empathic Pain emotion - Dark Red'),
('Entrancement', 'general', '#9370DB', 'Entrancement emotion - Medium Purple'),
('Envy', 'general', '#228B22', 'Envy emotion - Forest Green'),
('Excitement', 'general', '#FF4500', 'Excitement emotion - Orange Red'),
('Fear', 'general', '#800080', 'Fear emotion - Purple'),
('Guilt', 'general', '#4B0082', 'Guilt emotion - Indigo'),
('Horror', 'general', '#000000', 'Horror emotion - Black'),
('Interest', 'general', '#32CD32', 'Interest emotion - Lime Green'),
('Joy', 'general', '#FFD700', 'Joy emotion - Gold'),
('Love', 'general', '#FF1493', 'Love emotion - Deep Pink'),
('Nostalgia', 'general', '#DDA0DD', 'Nostalgia emotion - Plum'),
('Pain', 'general', '#DC143C', 'Pain emotion - Crimson Red'),
('Pride', 'general', '#FFD700', 'Pride emotion - Gold'),
('Realization', 'general', '#00CED1', 'Realization emotion - Dark Turquoise'),
('Relief', 'general', '#90EE90', 'Relief emotion - Light Green'),
('Romance', 'general', '#FF69B4', 'Romance emotion - Hot Pink'),
('Sadness', 'general', '#4169E1', 'Sadness emotion - Royal Blue'),
('Satisfaction', 'general', '#FFE4B5', 'Satisfaction emotion - Moccasin'),
('Desire', 'general', '#FF6347', 'Desire emotion - Tomato'),
('Shame', 'general', '#8B0000', 'Shame emotion - Dark Red'),
('Surprise (negative)', 'general', '#FFA500', 'Surprise (negative) emotion - Orange'),
('Surprise (positive)', 'general', '#FFD700', 'Surprise (positive) emotion - Gold'),
('Surprise', 'general', '#FFA500', 'Surprise emotion - Orange'),
('Sympathy', 'general', '#4169E1', 'Sympathy emotion - Royal Blue'),
('Tiredness', 'general', '#696969', 'Tiredness emotion - Dim Gray'),
('Triumph', 'general', '#FFD700', 'Triumph emotion - Gold'),
-- Vocal expressions (burst emotions)
('Cackle', 'burst', '#FF6347', 'Cackle vocal expression - Tomato'),
('Cheer', 'burst', '#FFD700', 'Cheer vocal expression - Gold'),
('Chuckle', 'burst', '#FFD700', 'Chuckle vocal expression - Gold'),
('Cry', 'burst', '#4169E1', 'Cry vocal expression - Royal Blue'),
('Gasp', 'burst', '#FFA500', 'Gasp vocal expression - Orange'),
('Giggle', 'burst', '#FFD700', 'Giggle vocal expression - Gold'),
('Groan', 'burst', '#808080', 'Groan vocal expression - Gray'),
('Growl', 'burst', '#DC143C', 'Growl vocal expression - Crimson Red'),
('Grunt', 'burst', '#8B4513', 'Grunt vocal expression - Saddle Brown'),
('Hiss', 'burst', '#8B4513', 'Hiss vocal expression - Saddle Brown'),
('Hoot', 'burst', '#FFD700', 'Hoot vocal expression - Gold'),
('Howl', 'burst', '#DC143C', 'Howl vocal expression - Crimson Red'),
('Laugh', 'burst', '#FFD700', 'Laugh vocal expression - Gold'),
('Moan', 'burst', '#4169E1', 'Moan vocal expression - Royal Blue'),
('Pant', 'burst', '#800080', 'Pant vocal expression - Purple'),
('Roar', 'burst', '#DC143C', 'Roar vocal expression - Crimson Red'),
('Scream', 'burst', '#DC143C', 'Scream vocal expression - Crimson Red'),
('Screech', 'burst', '#800080', 'Screech vocal expression - Purple'),
('Shout', 'burst', '#FF6347', 'Shout vocal expression - Tomato'),
('Shriek', 'burst', '#800080', 'Shriek vocal expression - Purple'),
('Sigh', 'burst', '#87CEEB', 'Sigh vocal expression - Sky Blue'),
('Snicker', 'burst', '#FFD700', 'Snicker vocal expression - Gold'),
('Snort', 'burst', '#8B4513', 'Snort vocal expression - Saddle Brown'),
('Sob', 'burst', '#4169E1', 'Sob vocal expression - Royal Blue'),
('Squeal', 'burst', '#FF69B4', 'Squeal vocal expression - Hot Pink'),
('Wail', 'burst', '#4169E1', 'Wail vocal expression - Royal Blue'),
('Wheep', 'burst', '#4169E1', 'Wheep vocal expression - Royal Blue'),
('Whee', 'burst', '#FFD700', 'Whee vocal expression - Gold'),
('Whew', 'burst', '#90EE90', 'Whew vocal expression - Light Green'),
('Yawn', 'burst', '#808080', 'Yawn vocal expression - Gray'),
('Yelp', 'burst', '#FFA500', 'Yelp vocal expression - Orange'),
('Yuck', 'burst', '#8B4513', 'Yuck vocal expression - Saddle Brown'),
-- Neutral/Metadata
('Neutral', 'general', '#808080', 'Neutral emotion - Gray')
ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    color = EXCLUDED.color,
    description = EXCLUDED.description;

-- 3. 既存のemotion_namesに色を設定（色がNULLの場合）
UPDATE emotion_names 
SET color = CASE LOWER(name)
    WHEN 'joy' THEN '#FFD700'
    WHEN 'happiness' THEN '#FFD700'
    WHEN 'sadness' THEN '#4169E1'
    WHEN 'sad' THEN '#4169E1'
    WHEN 'anger' THEN '#DC143C'
    WHEN 'angry' THEN '#DC143C'
    WHEN 'fear' THEN '#800080'
    WHEN 'afraid' THEN '#800080'
    WHEN 'disgust' THEN '#8B4513'
    WHEN 'disgusted' THEN '#8B4513'
    WHEN 'surprise' THEN '#FFA500'
    WHEN 'surprised' THEN '#FFA500'
    WHEN 'calm' THEN '#87CEEB'
    WHEN 'calmness' THEN '#87CEEB'
    WHEN 'focus' THEN '#4682B4'
    WHEN 'concentration' THEN '#4682B4'
    WHEN 'excitement' THEN '#FF4500'
    WHEN 'excited' THEN '#FF4500'
    WHEN 'confusion' THEN '#A9A9A9'
    WHEN 'confused' THEN '#A9A9A9'
    WHEN 'neutral' THEN '#808080'
    ELSE '#A9A9A9' -- デフォルト: 不明な感情はグレー
END
WHERE color IS NULL;

