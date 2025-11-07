-- Drop visualization_results table
DROP INDEX IF EXISTS idx_visualization_results_created_at;
DROP INDEX IF EXISTS idx_visualization_results_method;
DROP INDEX IF EXISTS idx_visualization_results_type;
DROP INDEX IF EXISTS idx_visualization_results_participant;
DROP TABLE IF EXISTS visualization_results;

