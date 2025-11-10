-- Force3D graph cache table for pre-computed participant force graph data
-- Merkle DAG: database.force3d_graph_cache
-- パラメータハッシュをキーとしてForce3Dグラフデータをキャッシュ
CREATE TABLE participant_force3d_graph_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  params_hash TEXT NOT NULL,  -- SHA256 hash of serialized parameters
  graph_data JSONB NOT NULL,  -- Pre-computed Force3D graph data (nodes + links)
  params JSONB NOT NULL,  -- Original parameters for reference
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- When computation was performed
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),  -- Cache expiration time
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, params_hash)  -- One cache entry per participant + params combination
);

-- Indexes for efficient queries
CREATE INDEX idx_force3d_cache_participant ON participant_force3d_graph_cache(participant_id);
CREATE INDEX idx_force3d_cache_params_hash ON participant_force3d_graph_cache(params_hash);
CREATE INDEX idx_force3d_cache_expires_at ON participant_force3d_graph_cache(expires_at);
CREATE INDEX idx_force3d_cache_participant_params ON participant_force3d_graph_cache(participant_id, params_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_force3d_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_participant_force3d_graph_cache_updated_at
  BEFORE UPDATE ON participant_force3d_graph_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_force3d_cache_updated_at();

-- Comments for documentation
COMMENT ON TABLE participant_force3d_graph_cache IS 'Pre-computed Force3D graph data for participants to improve query performance';
COMMENT ON COLUMN participant_force3d_graph_cache.params_hash IS 'SHA256 hash of serialized Force3DGraphParams for cache key';
COMMENT ON COLUMN participant_force3d_graph_cache.graph_data IS 'JSONB object with nodes and links arrays';
COMMENT ON COLUMN participant_force3d_graph_cache.params IS 'Original parameters used for computation (for debugging)';
COMMENT ON COLUMN participant_force3d_graph_cache.expires_at IS 'Cache expiration time (default: 1 hour)';

