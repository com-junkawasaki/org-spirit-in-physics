-- Merkle DAG: database_schema.projects -> project_data_persistence
-- Project関連のテーブル作成マイグレーション

-- Create project status type
CREATE TYPE project_status_type AS ENUM (
  'planning',
  'recruiting',
  'running',
  'analyzing',
  'completed'
);

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  purpose TEXT,
  status project_status_type NOT NULL DEFAULT 'planning',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_participants table (many-to-many relationship)
CREATE TABLE project_participants (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (project_id, participant_id)
);

-- Create experiment_configs table
CREATE TABLE experiment_configs (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  session_types TEXT[] NOT NULL DEFAULT ARRAY['session-1', 'session-2']::TEXT[],
  word_list TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  session_parameters JSONB NOT NULL DEFAULT '{}',
  analysis_parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_workflows table
CREATE TABLE project_workflows (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  workflow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "metadata": {}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_project_participants_project_id ON project_participants(project_id);
CREATE INDEX idx_project_participants_participant_id ON project_participants(participant_id);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiment_configs_updated_at 
  BEFORE UPDATE ON experiment_configs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_workflows_updated_at 
  BEFORE UPDATE ON project_workflows 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id AS project_id,
  COUNT(DISTINCT pp.participant_id) AS total_participants,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT prd.id) AS total_responses,
  COUNT(DISTINCT CASE WHEN s.end_time IS NULL THEN s.id END) AS active_sessions,
  COUNT(DISTINCT ar.id) AS completed_analyses,
  COALESCE(AVG(ar.spirit_probability), 0) AS average_spirit_probability
FROM projects p
LEFT JOIN project_participants pp ON p.id = pp.project_id
LEFT JOIN participants par ON pp.participant_id = par.id
LEFT JOIN participant_experiment_sessions s ON par.id = s.participant_id
LEFT JOIN participant_response_data prd ON par.id = prd.participant_id
LEFT JOIN participant_analysis_results ar ON par.id = ar.participant_id
GROUP BY p.id;

-- Add comments
COMMENT ON TABLE projects IS '研究プロジェクトの基本情報を格納';
COMMENT ON TABLE project_participants IS 'プロジェクトと参加者の多対多関係';
COMMENT ON TABLE experiment_configs IS 'プロジェクトの実験設定（セッション設定、単語リスト、分析パラメータ）';
COMMENT ON TABLE project_workflows IS 'プロジェクトのワークフロー定義';
COMMENT ON VIEW project_stats IS 'プロジェクトの統計情報（参加者数、セッション数、分析結果など）';

