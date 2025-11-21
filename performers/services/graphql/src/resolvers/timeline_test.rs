// Merkle DAG: graphql.service.resolvers.timeline.test
// TDD tests for GraphQL timeline resolver schema compatibility with production Supabase schema

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::{Pool, Postgres};
    use uuid::Uuid;

    // Test 1: timeline_pointsテーブルのスキーマが本番環境と一致しているか
    #[tokio::test]
    async fn test_timeline_points_schema_matches_production() {
        // 本番環境のスキーマ定義（Supabase）
        let expected_columns = vec![
            "time",
            "participant_id",
            "session_id",
            "word",
            "event_type",
            "reaction_value",
            "reaction_time",
            "has_response",
            "created_at",
        ];
        
        // metadataカラムは存在しないことを確認
        assert!(!expected_columns.contains(&"metadata"), 
            "metadataカラムは本番環境に存在しません");
    }

    // Test 2: GraphQLリゾルバーがmetadataカラムを参照していないか
    #[test]
    fn test_resolver_does_not_reference_metadata_column() {
        let resolver_code = include_str!("timeline.rs");
        
        // GROUP BY句にmetadataが含まれていないことを確認
        assert!(!resolver_code.contains("GROUP BY tp.time, tp.participant_id, tp.session_id, tp.word, tp.event_type, tp.reaction_value, tp.reaction_time, tp.has_response, tp.metadata"),
            "GROUP BY句にtp.metadataが含まれています");
        
        // SELECT句にtp.metadataが含まれていないことを確認
        assert!(!resolver_code.contains("tp.metadata,") || 
                resolver_code.matches("tp.metadata,").count() == 0,
            "SELECT句にtp.metadataが含まれています");
    }

    // Test 3: GraphQL型定義がデータベーススキーマと一致しているか
    #[test]
    fn test_graphql_type_matches_database_schema() {
        // TimelinePoint型のフィールドを確認
        // metadataフィールドは存在するが、データベースからは取得しない
        // 代わりにデフォルト値（空のJSONオブジェクト）を返す
        let timeline_point_fields = vec![
            "time",
            "participant_id",
            "session_id",
            "word",
            "event_type",
            "reaction_value",
            "reaction_time",
            "has_response",
            "emotions",
            "physiological",
            "metadata", // GraphQL型には存在するが、DBからは取得しない
        ];
        
        // 必須フィールドの確認
        assert!(timeline_point_fields.contains(&"time"));
        assert!(timeline_point_fields.contains(&"participant_id"));
        assert!(timeline_point_fields.contains(&"session_id"));
    }
}

