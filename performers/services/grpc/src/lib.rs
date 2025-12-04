// Merkle DAG: grpc.service.lib
// gRPC service library crate

// Include generated proto code
pub mod generated {
    include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.common.v1.rs"));
    pub mod common {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.common.v1.rs"));
        }
    }
    pub mod participants {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.participants.v1.rs"));
        }
    }
    pub mod sessions {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.sessions.v1.rs"));
        }
    }
    pub mod timeline {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.timeline.v1.rs"));
        }
    }
    pub mod stimulus_words {
        pub mod v1 {
            include!(concat!(env!("OUT_DIR"), "/spirit_in_physics.stimulus_words.v1.rs"));
        }
    }
}

pub mod services;
pub mod database;
pub mod auth;
pub mod error;

pub use database::PostgresPool;
