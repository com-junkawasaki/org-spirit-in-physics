// Merkle DAG: graphql.service.schema.compatibility.test
// TDD tests for GraphQL schema compatibility with production Supabase schema

use sqlx::{PgPool, Row};
use std::env;

/// 本番環境のSupabaseスキーマとローカルスキーマの整合性をテスト
#[tokio::test]
#[ignore] // 本番環境への接続が必要なため、デフォルトでは無視
async fn test_timeline_points_schema_matches_production() {
    let database_url = env::var("SUPABASE_DATABASE_URL")
        .expect("SUPABASE_DATABASE_URL環境変数が設定されていません");
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    // 本番環境のtimeline_pointsテーブルのカラムを取得
    let columns: Vec<String> = sqlx::query(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'timeline_points'
        ORDER BY ordinal_position
        "#
    )
    .map(|row: sqlx::postgres::PgRow| row.get("column_name"))
    .fetch_all(&pool)
    .await
    .expect("カラム情報の取得に失敗しました");
    
    // 期待されるカラム（本番環境のスキーマ）
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
    
    // カラム数が一致することを確認
    assert_eq!(columns.len(), expected_columns.len(),
        "カラム数が一致しません。期待: {}, 実際: {}", 
        expected_columns.len(), columns.len());
    
    // 各カラムが存在することを確認
    for expected_col in &expected_columns {
        assert!(columns.contains(&expected_col.to_string()),
            "カラム '{}' が存在しません", expected_col);
    }
    
    // metadataカラムが存在しないことを確認
    assert!(!columns.contains(&"metadata".to_string()),
        "metadataカラムは本番環境に存在しません");
    
    println!("✅ timeline_pointsテーブルのスキーマが本番環境と一致しています");
}

/// ローカルデータベースのスキーマをテスト
#[tokio::test]
async fn test_local_timeline_points_schema() {
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("ローカルデータベースへの接続に失敗しました");
    
    // ローカルのtimeline_pointsテーブルのカラムを取得
    let columns: Vec<String> = sqlx::query(
        r#"
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'timeline_points'
        ORDER BY ordinal_position
        "#
    )
    .map(|row: sqlx::postgres::PgRow| row.get("column_name"))
    .fetch_all(&pool)
    .await
    .expect("カラム情報の取得に失敗しました");
    
    // 期待されるカラム（本番環境のスキーマ）
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
    
    // カラム数が一致することを確認
    assert_eq!(columns.len(), expected_columns.len(),
        "ローカルデータベースのカラム数が本番環境と一致しません。期待: {}, 実際: {}", 
        expected_columns.len(), columns.len());
    
    // 各カラムが存在することを確認
    for expected_col in &expected_columns {
        assert!(columns.contains(&expected_col.to_string()),
            "カラム '{}' が存在しません", expected_col);
    }
    
    // metadataカラムが存在しないことを確認
    assert!(!columns.contains(&"metadata".to_string()),
        "ローカルデータベースにmetadataカラムが存在します。削除してください。");
    
    println!("✅ ローカルデータベースのスキーマが本番環境と一致しています");
}

/// GraphQLリゾルバーのSQLクエリが正しいことをテスト
#[test]
fn test_resolver_sql_does_not_reference_metadata() {
    let resolver_code = include_str!("../src/resolvers/timeline.rs");
    
    // GROUP BY句にmetadataが含まれていないことを確認
    let group_by_pattern = "GROUP BY tp.time, tp.participant_id, tp.session_id, tp.word, tp.event_type, tp.reaction_value, tp.reaction_time, tp.has_response";
    assert!(resolver_code.contains(group_by_pattern),
        "GROUP BY句が正しくありません。metadataが含まれていないことを確認してください");
    
    // SELECT句にtp.metadataが直接含まれていないことを確認
    // （コメントやデフォルト値の設定は許可）
    let select_queries: Vec<&str> = resolver_code
        .lines()
        .filter(|line| line.contains("SELECT") && line.contains("FROM timeline_points"))
        .collect();
    
    for query in select_queries {
        // SELECT句にtp.metadata,が含まれていないことを確認（カンマ付き）
        assert!(!query.contains("tp.metadata,"),
            "SELECT句にtp.metadata,が含まれています: {}", query);
    }
    
    println!("✅ GraphQLリゾルバーのSQLクエリが正しく、metadataカラムを参照していません");
}

/// GraphQL型定義がデータベーススキーマと互換性があることをテスト
#[test]
fn test_graphql_type_compatibility() {
    // TimelinePoint型の定義を確認
    let type_definition = include_str!("../src/types/timeline.rs");
    
    // metadataフィールドが存在することを確認（GraphQL型には存在するが、DBからは取得しない）
    assert!(type_definition.contains("pub metadata: Option<serde_json::Value>"),
        "TimelinePoint型にmetadataフィールドが定義されていません");
    
    println!("✅ GraphQL型定義がデータベーススキーマと互換性があります");
}

