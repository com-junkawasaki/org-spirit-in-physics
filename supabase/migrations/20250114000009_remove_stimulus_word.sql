-- Merkle DAG: normalization_fix -> remove_redundant_columns
-- stimulus_wordカラムを削除（word_stimulus_idからJOINで取得）

-- participant_response_dataからstimulus_wordを削除（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'participant_response_data'
  ) THEN
    ALTER TABLE participant_response_data 
    DROP COLUMN IF EXISTS stimulus_word;
  END IF;
END $$;

-- participant_analysis_resultsからstimulus_wordを削除（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'participant_analysis_results'
  ) THEN
    ALTER TABLE participant_analysis_results 
    DROP COLUMN IF EXISTS stimulus_word;
  END IF;
END $$;

-- 整合性チェック: word_stimulus_idとword_stimuliの整合性を保証するトリガー（word_stimuliが存在する場合のみ）
CREATE OR REPLACE FUNCTION check_word_stimulus_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- word_stimulus_idが存在することを確認
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'word_stimuli') THEN
    IF NOT EXISTS (SELECT 1 FROM word_stimuli WHERE id = NEW.word_stimulus_id) THEN
      RAISE EXCEPTION 'word_stimulus_id % does not exist in word_stimuli', NEW.word_stimulus_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'participant_response_data') THEN
    DROP TRIGGER IF EXISTS check_participant_response_data_word_stimulus ON participant_response_data;
    CREATE TRIGGER check_participant_response_data_word_stimulus
      BEFORE INSERT OR UPDATE ON participant_response_data
      FOR EACH ROW
      EXECUTE FUNCTION check_word_stimulus_consistency();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'participant_analysis_results') THEN
    DROP TRIGGER IF EXISTS check_participant_analysis_results_word_stimulus ON participant_analysis_results;
    CREATE TRIGGER check_participant_analysis_results_word_stimulus
      BEFORE INSERT OR UPDATE ON participant_analysis_results
      FOR EACH ROW
      EXECUTE FUNCTION check_word_stimulus_consistency();
  END IF;
END $$;

