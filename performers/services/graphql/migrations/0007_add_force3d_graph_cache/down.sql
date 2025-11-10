-- Drop Force3D graph cache table
DROP TRIGGER IF EXISTS update_participant_force3d_graph_cache_updated_at ON participant_force3d_graph_cache;
DROP FUNCTION IF EXISTS update_force3d_cache_updated_at();
DROP TABLE IF EXISTS participant_force3d_graph_cache;

