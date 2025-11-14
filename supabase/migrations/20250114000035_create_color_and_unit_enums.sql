-- Merkle DAG: create_color_and_unit_enums -> emotion_color_enum, measurement_unit_enum
-- colorとunitをENUM型に変換し、マスターテーブル削除の準備

-- 1. emotion_color_enum ENUM型の作成（使用されているHEXカラーコードを全て列挙）
CREATE TYPE emotion_color_enum AS ENUM (
    '#000000', -- Black
    '#00CED1', -- Dark Turquoise
    '#228B22', -- Forest Green
    '#2F4F4F', -- Dark Slate Gray
    '#32CD32', -- Lime Green
    '#4169E1', -- Royal Blue
    '#4682B4', -- Steel Blue
    '#4B0082', -- Indigo
    '#6495ED', -- Cornflower Blue
    '#696969', -- Dim Gray
    '#708090', -- Slate Gray
    '#808080', -- Gray
    '#87CEEB', -- Sky Blue
    '#8B0000', -- Dark Red
    '#8B4513', -- Saddle Brown
    '#90EE90', -- Light Green
    '#9370DB', -- Medium Purple
    '#A9A9A9', -- Dark Gray
    '#C0C0C0', -- Silver
    '#D3D3D3', -- Light Gray
    '#DDA0DD', -- Plum
    '#DC143C', -- Crimson Red
    '#FF1493', -- Deep Pink
    '#FF4500', -- Orange Red
    '#FF6347', -- Tomato
    '#FF69B4', -- Hot Pink
    '#FF8C00', -- Dark Orange
    '#FFA500', -- Orange
    '#FFB6C1', -- Light Pink
    '#FFD700', -- Gold
    '#FFE4B5'  -- Moccasin
);

-- 2. measurement_unit_enum ENUM型の作成（生理的測定の単位）
CREATE TYPE measurement_unit_enum AS ENUM (
    'mV',      -- Millivolt (皮膚電位など)
    'bpm',     -- Beats per minute (心拍数)
    'mmHg',    -- Millimeter of mercury (血圧)
    'Hz',      -- Hertz (周波数)
    'dB',      -- Decibel (音圧レベル)
    's',       -- Second (時間)
    'ms',      -- Millisecond (時間)
    'none',    -- 単位なし
    'unknown'  -- 不明
);

-- 3. emotion_name_enumからemotion_color_enumへのマッピング関数を作成
CREATE OR REPLACE FUNCTION get_emotion_color(emotion_name emotion_name_enum)
RETURNS emotion_color_enum AS $$
BEGIN
    RETURN CASE emotion_name::text
        -- Gold (#FFD700)
        WHEN 'Amusement' THEN '#FFD700'::emotion_color_enum
        WHEN 'Ecstasy' THEN '#FFD700'::emotion_color_enum
        WHEN 'Joy' THEN '#FFD700'::emotion_color_enum
        WHEN 'Pride' THEN '#FFD700'::emotion_color_enum
        WHEN 'Surprise (positive)' THEN '#FFD700'::emotion_color_enum
        WHEN 'Triumph' THEN '#FFD700'::emotion_color_enum
        WHEN 'Cheer' THEN '#FFD700'::emotion_color_enum
        WHEN 'Chuckle' THEN '#FFD700'::emotion_color_enum
        WHEN 'Giggle' THEN '#FFD700'::emotion_color_enum
        WHEN 'Hoot' THEN '#FFD700'::emotion_color_enum
        WHEN 'Laugh' THEN '#FFD700'::emotion_color_enum
        WHEN 'Snicker' THEN '#FFD700'::emotion_color_enum
        WHEN 'Whee' THEN '#FFD700'::emotion_color_enum
        
        -- Crimson Red (#DC143C)
        WHEN 'Anger' THEN '#DC143C'::emotion_color_enum
        WHEN 'Pain' THEN '#DC143C'::emotion_color_enum
        WHEN 'Growl' THEN '#DC143C'::emotion_color_enum
        WHEN 'Howl' THEN '#DC143C'::emotion_color_enum
        WHEN 'Roar' THEN '#DC143C'::emotion_color_enum
        WHEN 'Scream' THEN '#DC143C'::emotion_color_enum
        
        -- Royal Blue (#4169E1)
        WHEN 'Awe' THEN '#4169E1'::emotion_color_enum
        WHEN 'Sadness' THEN '#4169E1'::emotion_color_enum
        WHEN 'Sympathy' THEN '#4169E1'::emotion_color_enum
        WHEN 'Cry' THEN '#4169E1'::emotion_color_enum
        WHEN 'Moan' THEN '#4169E1'::emotion_color_enum
        WHEN 'Sob' THEN '#4169E1'::emotion_color_enum
        WHEN 'Wail' THEN '#4169E1'::emotion_color_enum
        WHEN 'Wheep' THEN '#4169E1'::emotion_color_enum
        
        -- Purple (#800080)
        WHEN 'Fear' THEN '#800080'::emotion_color_enum
        WHEN 'Pant' THEN '#800080'::emotion_color_enum
        WHEN 'Screech' THEN '#800080'::emotion_color_enum
        WHEN 'Shriek' THEN '#800080'::emotion_color_enum
        
        -- Sky Blue (#87CEEB)
        WHEN 'Calmness' THEN '#87CEEB'::emotion_color_enum
        WHEN 'Sigh' THEN '#87CEEB'::emotion_color_enum
        
        -- Hot Pink (#FF69B4)
        WHEN 'Admiration' THEN '#FF69B4'::emotion_color_enum
        WHEN 'Romance' THEN '#FF69B4'::emotion_color_enum
        WHEN 'Squeal' THEN '#FF69B4'::emotion_color_enum
        
        -- Gray (#808080)
        WHEN 'Boredom' THEN '#808080'::emotion_color_enum
        WHEN 'Groan' THEN '#808080'::emotion_color_enum
        WHEN 'Neutral' THEN '#808080'::emotion_color_enum
        WHEN 'Yawn' THEN '#808080'::emotion_color_enum
        
        -- Dark Gray (#A9A9A9)
        WHEN 'Confusion' THEN '#A9A9A9'::emotion_color_enum
        
        -- Saddle Brown (#8B4513)
        WHEN 'Contempt' THEN '#8B4513'::emotion_color_enum
        WHEN 'Disgust' THEN '#8B4513'::emotion_color_enum
        WHEN 'Grunt' THEN '#8B4513'::emotion_color_enum
        WHEN 'Hiss' THEN '#8B4513'::emotion_color_enum
        WHEN 'Snort' THEN '#8B4513'::emotion_color_enum
        WHEN 'Yuck' THEN '#8B4513'::emotion_color_enum
        
        -- Orange (#FFA500)
        WHEN 'Surprise (negative)' THEN '#FFA500'::emotion_color_enum
        WHEN 'Surprise' THEN '#FFA500'::emotion_color_enum
        WHEN 'Gasp' THEN '#FFA500'::emotion_color_enum
        WHEN 'Yelp' THEN '#FFA500'::emotion_color_enum
        
        -- Light Green (#90EE90)
        WHEN 'Relief' THEN '#90EE90'::emotion_color_enum
        WHEN 'Whew' THEN '#90EE90'::emotion_color_enum
        
        -- その他の色
        WHEN 'Adoration' THEN '#FFB6C1'::emotion_color_enum
        WHEN 'Aesthetic Appreciation' THEN '#DDA0DD'::emotion_color_enum
        WHEN 'Anxiety' THEN '#9370DB'::emotion_color_enum
        WHEN 'Awkwardness' THEN '#D3D3D3'::emotion_color_enum
        WHEN 'Concentration' THEN '#4682B4'::emotion_color_enum
        WHEN 'Contemplation' THEN '#6495ED'::emotion_color_enum
        WHEN 'Contentment' THEN '#FFE4B5'::emotion_color_enum
        WHEN 'Craving' THEN '#FF6347'::emotion_color_enum
        WHEN 'Determination' THEN '#FF8C00'::emotion_color_enum
        WHEN 'Disappointment' THEN '#708090'::emotion_color_enum
        WHEN 'Distress' THEN '#2F4F4F'::emotion_color_enum
        WHEN 'Doubt' THEN '#C0C0C0'::emotion_color_enum
        WHEN 'Embarrassment' THEN '#FFB6C1'::emotion_color_enum
        WHEN 'Empathic Pain' THEN '#8B0000'::emotion_color_enum
        WHEN 'Entrancement' THEN '#9370DB'::emotion_color_enum
        WHEN 'Envy' THEN '#228B22'::emotion_color_enum
        WHEN 'Excitement' THEN '#FF4500'::emotion_color_enum
        WHEN 'Guilt' THEN '#4B0082'::emotion_color_enum
        WHEN 'Horror' THEN '#000000'::emotion_color_enum
        WHEN 'Interest' THEN '#32CD32'::emotion_color_enum
        WHEN 'Love' THEN '#FF1493'::emotion_color_enum
        WHEN 'Nostalgia' THEN '#DDA0DD'::emotion_color_enum
        WHEN 'Realization' THEN '#00CED1'::emotion_color_enum
        WHEN 'Satisfaction' THEN '#FFE4B5'::emotion_color_enum
        WHEN 'Desire' THEN '#FF6347'::emotion_color_enum
        WHEN 'Shame' THEN '#8B0000'::emotion_color_enum
        WHEN 'Tiredness' THEN '#696969'::emotion_color_enum
        WHEN 'Cackle' THEN '#FF6347'::emotion_color_enum
        WHEN 'Shout' THEN '#FF6347'::emotion_color_enum
        
        -- デフォルト: 不明な感情はグレー
        ELSE '#A9A9A9'::emotion_color_enum
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. コメント追加
COMMENT ON TYPE emotion_color_enum IS 'ENUM type for emotion colors (HEX color codes). Used to replace emotion_names.color column.';
COMMENT ON TYPE measurement_unit_enum IS 'ENUM type for physiological measurement units. Used to replace physiological_measurement_types.unit column.';
COMMENT ON FUNCTION get_emotion_color(emotion_name_enum) IS 'Maps emotion_name_enum to emotion_color_enum. Returns HEX color code for the given emotion name.';

