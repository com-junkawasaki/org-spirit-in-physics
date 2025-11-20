// Merkle DAG: graphql.service.e2e.public_access.test
// E2E tests for public access control with is_public flag

use async_graphql::Request;
use graphql_service::schema::create_schema;
use sqlx::PgPool;
use uuid::Uuid;

/// 認証なしで participants クエリが公開参加者のみを返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_participants_query_without_auth_returns_only_public() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // 認証なしで participants クエリを実行
    let query = r#"
        query {
            participants {
                id
                isPublic
                age
                gender
            }
        }
    "#;
    
    let request = Request::new(query);
    let response = schema.execute(request).await;
    
    // エラーが発生しないことを確認
    assert!(response.errors.is_empty(), 
        "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
    
    // データが取得できたことを確認
    let json_data = response.data.into_json()
        .expect("レスポンスのパースに失敗しました");
    let participants = json_data
        .get("participants")
        .and_then(|v| v.as_array())
        .expect("participants データが見つかりません");
    
    // すべての参加者が公開フラグが true であることを確認
    for participant in participants {
        let is_public = participant.get("isPublic")
            .and_then(|v| v.as_bool())
            .expect("isPublic フィールドが見つかりません");
        
        assert!(is_public, 
            "認証なしのクエリで非公開参加者が返されました: {:?}", participant);
    }
    
    println!("✅ 認証なしで participants クエリが公開参加者のみを返すことを確認しました（{}件）", participants.len());
}

/// 認証ありで participants クエリが全参加者を返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_participants_query_with_auth_returns_all() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // データベースから全参加者数を取得（認証状態に関係なく）
    let total_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM participants"
    )
    .fetch_one(&pool)
    .await
    .expect("参加者数の取得に失敗しました");
    
    // 認証ありで participants クエリを実行（AuthContext を追加）
    let query = r#"
        query {
            participants {
                id
                isPublic
                age
                gender
            }
        }
    "#;
    
    // 認証コンテキストを追加（モック）
    // 実際の実装では、Clerk JWT トークンから取得される
    use graphql_service::auth::AuthContext;
    let auth_context = AuthContext::new(
        "test-user-id".to_string(),
        Some("test-session-id".to_string()),
        Some("test@example.com".to_string()),
    );
    
    let mut request = Request::new(query);
    request = request.data(auth_context);
    
    let response = schema.execute(request).await;
    
    // エラーが発生しないことを確認
    assert!(response.errors.is_empty(), 
        "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
    
    // データが取得できたことを確認
    let json_data = response.data.into_json()
        .expect("レスポンスのパースに失敗しました");
    let participants = json_data
        .get("participants")
        .and_then(|v| v.as_array())
        .expect("participants データが見つかりません");
    
    // 認証ありの場合は全参加者が返されることを確認
    assert_eq!(participants.len() as i64, total_count,
        "認証ありのクエリで全参加者が返されませんでした（期待: {}, 実際: {}）", 
        total_count, participants.len());
    
    println!("✅ 認証ありで participants クエリが全参加者を返すことを確認しました（{}件）", participants.len());
}

/// 認証なしで sessions クエリが公開参加者のセッションのみを返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_sessions_query_without_auth_returns_only_public_participant() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // 公開参加者のIDを取得
    let public_participant_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM participants WHERE is_public = true LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .expect("公開参加者の取得に失敗しました");
    
    if let Some(participant_id) = public_participant_id {
        let query = format!(
            r#"
            query {{
                sessions(participantId: "{}") {{
                    id
                    participantId
                    sessionIndex
                }}
            }}
            "#,
            participant_id
        );
        
        let request = Request::new(query);
        let response = schema.execute(request).await;
        
        // エラーが発生しないことを確認
        assert!(response.errors.is_empty(), 
            "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
        
        println!("✅ 認証なしで sessions クエリが公開参加者のセッションを返すことを確認しました");
    } else {
        println!("⚠️  公開参加者が存在しないため、テストをスキップしました");
    }
}

/// 認証なしで非公開参加者の sessions クエリがエラーを返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_sessions_query_without_auth_for_private_participant_returns_empty() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // 非公開参加者のIDを取得（存在する場合）
    let private_participant_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM participants WHERE is_public = false LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .expect("非公開参加者の取得に失敗しました");
    
    if let Some(participant_id) = private_participant_id {
        let query = format!(
            r#"
            query {{
                sessions(participantId: "{}") {{
                    id
                    participantId
                    sessionIndex
                }}
            }}
            "#,
            participant_id
        );
        
        let request = Request::new(query);
        let response = schema.execute(request).await;
        
        // エラーが発生しないことを確認（空の配列が返される）
        assert!(response.errors.is_empty(), 
            "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
        
        // 空の配列が返されることを確認
        let json_data = response.data.into_json()
            .expect("レスポンスのパースに失敗しました");
        let sessions = json_data
            .get("sessions")
            .and_then(|v| v.as_array())
            .expect("sessions データが見つかりません");
        
        assert_eq!(sessions.len(), 0,
            "認証なしで非公開参加者のセッションが返されました（期待: 0件, 実際: {}件）", 
            sessions.len());
        
        println!("✅ 認証なしで非公開参加者の sessions クエリが空の配列を返すことを確認しました");
    } else {
        println!("⚠️  非公開参加者が存在しないため、テストをスキップしました");
    }
}

/// 認証なしで timeline クエリが公開参加者のタイムラインデータのみを返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_timeline_query_without_auth_returns_only_public_participant() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // 公開参加者のIDを取得
    let public_participant_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM participants WHERE is_public = true LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .expect("公開参加者の取得に失敗しました");
    
    if let Some(participant_id) = public_participant_id {
        let query = format!(
            r#"
            query {{
                timeline(participantId: "{}") {{
                    time
                    participantId
                    sessionId
                    word
                    hasResponse
                }}
            }}
            "#,
            participant_id
        );
        
        let request = Request::new(query);
        let response = schema.execute(request).await;
        
        // エラーが発生しないことを確認
        assert!(response.errors.is_empty(), 
            "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
        
        println!("✅ 認証なしで timeline クエリが公開参加者のタイムラインデータを返すことを確認しました");
    } else {
        println!("⚠️  公開参加者が存在しないため、テストをスキップしました");
    }
}

/// 認証なしで非公開参加者の timeline クエリが空の配列を返すことをテスト
#[tokio::test]
#[ignore] // データベース接続が必要なため、デフォルトでは無視
async fn test_timeline_query_without_auth_for_private_participant_returns_empty() {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/spirit_in_physics".to_string());
    
    let pool = PgPool::connect(&database_url).await
        .expect("データベースへの接続に失敗しました");
    
    let schema = create_schema(pool.clone()).await
        .expect("スキーマの作成に失敗しました");
    
    // 非公開参加者のIDを取得（存在する場合）
    let private_participant_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM participants WHERE is_public = false LIMIT 1"
    )
    .fetch_optional(&pool)
    .await
    .expect("非公開参加者の取得に失敗しました");
    
    if let Some(participant_id) = private_participant_id {
        let query = format!(
            r#"
            query {{
                timeline(participantId: "{}") {{
                    time
                    participantId
                    sessionId
                    word
                    hasResponse
                }}
            }}
            "#,
            participant_id
        );
        
        let request = Request::new(query);
        let response = schema.execute(request).await;
        
        // エラーが発生しないことを確認（空の配列が返される）
        assert!(response.errors.is_empty(), 
            "GraphQLクエリでエラーが発生しました: {:?}", response.errors);
        
        // 空の配列が返されることを確認
        let json_data = response.data.into_json()
            .expect("レスポンスのパースに失敗しました");
        let timeline = json_data
            .get("timeline")
            .and_then(|v| v.as_array())
            .expect("timeline データが見つかりません");
        
        assert_eq!(timeline.len(), 0,
            "認証なしで非公開参加者のタイムラインデータが返されました（期待: 0件, 実際: {}件）", 
            timeline.len());
        
        println!("✅ 認証なしで非公開参加者の timeline クエリが空の配列を返すことを確認しました");
    } else {
        println!("⚠️  非公開参加者が存在しないため、テストをスキップしました");
    }
}

