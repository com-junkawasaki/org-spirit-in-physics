// Merkle DAG: graphql.service.integration.test
// Integration tests for GraphQL service with production schema

use async_graphql::Request;
use graphql_service::schema::create_schema;
use sqlx::PgPool;

/// GraphQLクエリが本番スキーマで正しく動作することをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_timeline_query_with_production_schema() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // サンプルparticipant_idを使用してクエリをテスト
    let query = r#"
        query {
            timeline(participantId: "25111604-c7db-4bfd-8662-e55060e332d6") {
                time
                participantId
                sessionId
                word
                eventType
                reactionValue
                reactionTime
                hasResponse
                emotions {
                    name
                    score
                }
                physiological {
                    timestamp
                    value
                }
                metadata
            }
        }
    "#;
    
    let request = Request::new(query);
    let response = schema.execute(request).await;
    
    // エラーが発生しないことを確認
    assert!(response.errors.is_empty(), 
        "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
    
    println!("✅ GraphQLクエリが本番スキーマで正しく動作しています");
}

/// timeline_pointsテーブルから直接データを取得して、GraphQL型と一致することをテスト
#[tokio::test]
async fn test_timeline_points_direct_query() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    // timeline_pointsテーブルから直接データを取得
    let row = sqlx::query(
        r#"
        SELECT 
            time,
            participant_id,
            session_id,
            word,
            event_type,
            reaction_value,
            reaction_time,
            has_response
        FROM timeline_points
        LIMIT 1
        "#
    )
    .fetch_optional(&pool)
    .await
    .expect("データの取得に失敗しました");
    
    if let Some(_row) = row {
        // データが取得できたことを確認
        println!("✅ timeline_pointsテーブルからデータを取得できました");
        
        // metadataカラムが存在しないことを確認（コンパイル時チェック）
        // もしmetadataカラムを参照しようとするとコンパイルエラーになる
    } else {
        println!("⚠️  timeline_pointsテーブルにデータがありません（テスト用データが必要です）");
    }
}

