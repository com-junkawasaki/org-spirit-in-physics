//! Identity Module
//!
//! 人物識別モジュール。
//! 顔認識・Cookie管理・Person解決を行う。

pub mod face_recognition;
pub mod cookie_manager;
pub mod person_resolver;

pub use face_recognition::FaceRecognition;
pub use cookie_manager::CookieManager;
pub use person_resolver::PersonResolver;

