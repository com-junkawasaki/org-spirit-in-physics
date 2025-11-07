use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel::pg::PgConnection;
use diesel::RunQueryDsl;
use std::env;

pub mod schema;

pub type DbPool = Pool<ConnectionManager<PgConnection>>;
pub type DbConnection = PooledConnection<ConnectionManager<PgConnection>>;

pub fn establish_connection() -> anyhow::Result<DbPool> {
    let database_url = env::var("DATABASE_URL")
        .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set"))?;

    // Log the database URL (without password) for debugging
    let url_for_log = database_url.split('@').nth(1).unwrap_or("unknown");
    tracing::info!("Connecting to database: ...@{}", url_for_log);

    let manager = ConnectionManager::<PgConnection>::new(database_url.clone());
    let pool = Pool::builder()
        .build(manager)
        .map_err(|e| anyhow::anyhow!("Failed to create connection pool: {} (DATABASE_URL: ...@{})", e, url_for_log))?;

    // Test connection by executing a simple query and check if participants table exists
    let mut test_conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get test connection: {}", e))?;
    
    // Check if participants table exists
    use diesel::sql_query;
    use diesel::QueryableByName;
    use diesel::sql_types::Text;
    
    #[derive(QueryableByName)]
    struct TableCheck {
        #[diesel(sql_type = Text, column_name = "tablename")]
        tablename: String,
    }
    
    // Check current database and schema
    #[derive(QueryableByName)]
    struct DbInfo {
        #[diesel(sql_type = Text, column_name = "current_database")]
        current_database: String,
        #[diesel(sql_type = Text, column_name = "current_schema")]
        current_schema: String,
    }
    
    // Check current database and schema
    #[derive(QueryableByName)]
    struct DbInfo {
        #[diesel(sql_type = Text, column_name = "current_database")]
        current_database: String,
        #[diesel(sql_type = Text, column_name = "current_schema")]
        current_schema: String,
    }
    
    let db_info: Result<Vec<DbInfo>, _> = sql_query("SELECT current_database(), current_schema()")
        .load(&mut *test_conn);
    
    if let Ok(info) = db_info {
        if let Some(db) = info.first() {
            tracing::info!("Connected to database: {}, schema: {}", db.current_database, db.current_schema);
        }
    }
    
    // Try to query participants table directly (without pg_tables)
    let test_participants: Result<usize, _> = sql_query("SELECT COUNT(*) FROM public.participants")
        .execute(&mut *test_conn);
    
    match test_participants {
        Ok(count) => {
            tracing::info!("Successfully queried participants table (count: {})", count);
        }
        Err(e) => {
            tracing::error!("Failed to query participants table directly: {}", e);
            // List all tables in public schema for debugging
            #[derive(QueryableByName)]
            struct TableName {
                #[diesel(sql_type = Text, column_name = "tablename")]
                tablename: String,
            }
            
            let all_tables: Result<Vec<TableName>, _> = sql_query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 10"
            ).load(&mut *test_conn);
            
            match all_tables {
                Ok(tables) => {
                    tracing::info!("Found {} tables in public schema", tables.len());
                    for table in &tables {
                        tracing::info!("  - {}", table.tablename);
                    }
                }
                Err(e) => {
                    tracing::warn!("Failed to list tables: {}", e);
                }
            }
        }
    }

    Ok(pool)
}

pub fn get_connection(pool: &DbPool) -> anyhow::Result<DbConnection> {
    pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get connection from pool: {}", e))
}

