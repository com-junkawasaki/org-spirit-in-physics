-- Visualization results table for caching computed visualization data
CREATE TABLE visualization_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  visualization_type TEXT NOT NULL,  -- 'emotion_distance', 'timeline', 'force_3d'
  method TEXT,  -- 'cosine', 'weighted_cosine', 'gower', 'combined', 'fusion'
  embedding_method TEXT,  -- 'pca', 'umap', 'force'
  dimensions INTEGER,  -- 2 or 3
  result_data JSONB NOT NULL,  -- VisualizationData or TimelineDataPoint[] or Force3DGraphData
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visualization_results_participant ON visualization_results(participant_id);
CREATE INDEX idx_visualization_results_type ON visualization_results(visualization_type);
CREATE INDEX idx_visualization_results_method ON visualization_results(method);
CREATE INDEX idx_visualization_results_created_at ON visualization_results(created_at);

