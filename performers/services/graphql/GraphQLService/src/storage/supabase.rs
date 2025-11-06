//! Supabase REST API client for GraphQL server
//! 
//! Merkle DAG: graphql.storage.supabase
//! OWL: spirit:GraphQL Service Port Supabase integration

use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::Value;
use std::env;

pub struct SupabaseClient {
    client: Client,
    url: String,
    service_role_key: String,
}

impl SupabaseClient {
    pub fn new() -> Result<Self> {
        let url = env::var("SUPABASE_URL")
            .or_else(|_| env::var("NEXT_PUBLIC_SUPABASE_URL"))
            .map_err(|_| anyhow!("SUPABASE_URL not set"))?;

        let service_role_key = env::var("SUPABASE_SERVICE_ROLE_KEY")
            .or_else(|_| env::var("SUPABASE_ANON_KEY"))
            .map_err(|_| anyhow!("SUPABASE_SERVICE_ROLE_KEY not set"))?;

        Ok(Self {
            client: Client::new(),
            url,
            service_role_key,
        })
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "apikey",
            self.service_role_key.parse().unwrap(),
        );
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.service_role_key).parse().unwrap(),
        );
        headers.insert(
            "Content-Type",
            "application/json".parse().unwrap(),
        );
        headers.insert(
            "Prefer",
            "return=representation".parse().unwrap(),
        );
        headers
    }

    /// Get all participants
    pub async fn get_participants(&self) -> Result<Vec<Value>> {
        let url = format!("{}/rest/v1/participants?order=created_at.desc", self.url);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch participants: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Get participant by ID
    pub async fn get_participant(&self, participant_id: &str) -> Result<Value> {
        let url = format!("{}/rest/v1/participants?id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch participant: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Participant {} not found", participant_id))
    }

    /// Get sessions
    pub async fn get_sessions(&self, participant_id: Option<&str>) -> Result<Vec<Value>> {
        let mut url = format!("{}/rest/v1/participant_experiment_sessions?order=start_time.desc", self.url);
        
        if let Some(pid) = participant_id {
            url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}&order=start_time.desc", self.url, pid);
        }

        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch sessions: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Get analysis results
    pub async fn get_analysis_results(
        &self,
        participant_id: Option<&str>,
        experiment_id: Option<&str>,
    ) -> Result<Vec<Value>> {
        let mut url = format!("{}/rest/v1/participant_analysis_results?order=created_at.desc", self.url);
        
        let mut params = Vec::new();
        if let Some(pid) = participant_id {
            params.push(format!("participant_id=eq.{}", pid));
        }
        if let Some(eid) = experiment_id {
            params.push(format!("experiment_id=eq.{}", eid));
        }
        
        if !params.is_empty() {
            url = format!("{}/rest/v1/participant_analysis_results?{}&order=created_at.desc", 
                self.url, params.join("&"));
        }

        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch analysis results: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Create participant
    pub async fn create_participant(&self, age: Option<i32>, gender: Option<&str>, handedness: Option<&str>) -> Result<Value> {
        let mut participant_data = serde_json::json!({});
        
        if let Some(a) = age {
            participant_data["age"] = a.into();
        }
        if let Some(g) = gender {
            participant_data["gender"] = g.into();
        }
        if let Some(h) = handedness {
            participant_data["handedness"] = h.into();
        }

        let url = format!("{}/rest/v1/participants", self.url);
        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&participant_data)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to create participant: {} - {}", status, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to create participant: empty response"))
    }

    /// Save consent
    pub async fn save_consent(
        &self,
        participant_id: &str,
        signature: &str,
        agreements: &Value,
        agreed_at: &str,
        consent_version: Option<&str>,
        study_id: Option<&str>,
        user_agent: Option<&str>,
        ip_address: Option<&str>,
        consent_text: Option<&str>,
        demographic_data: Option<&Value>,
    ) -> Result<Value> {
        // Check if participant exists
        let _participant = self.get_participant(participant_id).await?;

        // Update participant demographics if provided
        if let Some(demo) = demographic_data {
            let mut update_data = serde_json::json!({});
            
            if let Some(age_group) = demo.get("ageGroup").and_then(|v| v.as_i64()) {
                update_data["age"] = age_group.into();
            }
            if let Some(gender) = demo.get("gender").and_then(|v| v.as_str()) {
                update_data["gender"] = gender.into();
            }
            if let Some(ethnicity) = demo.get("ethnicity").and_then(|v| v.as_str()) {
                update_data["ethnicity"] = ethnicity.into();
            }
            if let Some(income) = demo.get("income").and_then(|v| v.as_str()) {
                update_data["income"] = income.into();
            }
            if let Some(cv) = consent_version {
                update_data["consent_version"] = cv.into();
            }
            if let Some(sid) = study_id {
                update_data["study_id"] = sid.into();
            }

            if update_data.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
                let update_url = format!("{}/rest/v1/participants?id=eq.{}", self.url, participant_id);
                let _ = self.client
                    .patch(&update_url)
                    .headers(self.headers())
                    .json(&update_data)
                    .send()
                    .await;
            }
        }

        // Save consent
        let mut consent_data = serde_json::json!({
            "participant_id": participant_id,
            "signature": signature,
            "agreements": agreements,
            "agreed_at": agreed_at,
        });

        if let Some(cv) = consent_version {
            consent_data["consent_version"] = cv.into();
        }
        if let Some(sid) = study_id {
            consent_data["study_id"] = sid.into();
        }
        if let Some(ua) = user_agent {
            consent_data["user_agent"] = ua.into();
        }
        if let Some(ip) = ip_address {
            consent_data["ip_address"] = ip.into();
        }
        if let Some(ct) = consent_text {
            consent_data["consent_text"] = ct.into();
        }

        let url = format!("{}/rest/v1/participant_consents", self.url);
        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&consent_data)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to save consent: {} - {}", status, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to save consent: empty response"))
    }

    /// Get consent
    pub async fn get_consent(&self, participant_id: &str) -> Result<Option<Value>> {
        let url = format!("{}/rest/v1/participant_consents?participant_id=eq.{}", self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch consent: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data.into_iter().next())
    }

    /// Save session with events and word responses
    pub async fn save_session(
        &self,
        participant_id: &str,
        events: &[Value],
        word_responses: &[Value],
    ) -> Result<Value> {
        // Determine session type and timestamps
        let session_started_event = events.iter().find(|e| e.get("type").and_then(|v| v.as_str()) == Some("session_started"));
        let session_ended_events: Vec<_> = events.iter()
            .filter(|e| e.get("type").and_then(|v| v.as_str()) == Some("response_window_closed"))
            .collect();
        let session_ended_event = session_ended_events.last();

        let start_time = session_started_event
            .and_then(|e| e.get("timestamp").and_then(|v| v.as_i64()))
            .or_else(|| events.first().and_then(|e| e.get("timestamp").and_then(|v| v.as_i64())))
            .map(|ts| chrono::DateTime::from_timestamp_millis(ts).unwrap_or_else(|| chrono::Utc::now()))
            .unwrap_or_else(|| chrono::Utc::now())
            .to_rfc3339();

        let end_time = session_ended_event
            .and_then(|e| e.get("timestamp").and_then(|v| v.as_i64()))
            .map(|ts| chrono::DateTime::from_timestamp_millis(ts).unwrap_or_else(|| chrono::Utc::now()).to_rfc3339());

        let session_type = if events.iter().any(|e| e.get("type").and_then(|v| v.as_str()).map(|s| s.contains("session-2")).unwrap_or(false)) {
            "session-2"
        } else {
            "session-1"
        };
        let session_id = format!("{}_{}", participant_id, session_type);

        // Save session
        let mut session_data = serde_json::json!({
            "participant_id": participant_id,
            "session_id": session_id,
            "session_type": session_type,
            "start_time": start_time,
        });
        if let Some(et) = end_time {
            session_data["end_time"] = et.into();
        }

        let url = format!("{}/rest/v1/participant_experiment_sessions", self.url);
        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&session_data)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to save session: {} - {}", status, error_text));
        }

        let session_data_vec: Vec<Value> = response.json().await?;
        let session = session_data_vec.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to save session: empty response"))?;
        let session_uuid = session["id"].as_str()
            .ok_or_else(|| anyhow!("Session ID not found"))?;

        // Delete existing events (to prevent duplicates)
        let delete_events_url = format!("{}/rest/v1/participant_session_events?participant_id=eq.{}&session_id=eq.{}", 
            self.url, participant_id, session_uuid);
        let _ = self.client
            .delete(&delete_events_url)
            .headers(self.headers())
            .send()
            .await;

        // Save events
        if !events.is_empty() {
            let events_to_insert: Vec<Value> = events.iter().map(|event| {
                let timestamp = event.get("timestamp")
                    .and_then(|v| v.as_i64())
                    .map(|ts| chrono::DateTime::from_timestamp_millis(ts).unwrap_or_else(|| chrono::Utc::now()).to_rfc3339())
                    .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                serde_json::json!({
                    "participant_id": participant_id,
                    "session_id": session_uuid,
                    "event_type": event.get("type").and_then(|v| v.as_str()).unwrap_or("unknown"),
                    "timestamp": timestamp,
                    "payload": event.get("payload").cloned().unwrap_or(serde_json::json!({})),
                })
            }).collect();

            let events_url = format!("{}/rest/v1/participant_session_events", self.url);
            let events_response = self.client
                .post(&events_url)
                .headers(self.headers())
                .json(&events_to_insert)
                .send()
                .await?;

            let events_status = events_response.status();
            if !events_status.is_success() {
                let error_text = events_response.text().await.unwrap_or_default();
                return Err(anyhow!("Failed to save session events: {} - {}", events_status, error_text));
            }
        }

        // Save word responses
        if !word_responses.is_empty() {
            let responses_to_insert: Vec<Value> = word_responses.iter().map(|wr| {
                let stimulus_word = wr.get("stimulus_word")
                    .and_then(|v| {
                        if v.is_string() {
                            v.as_str().map(|s| s.to_string())
                        } else if v.is_object() {
                            v.get("word").and_then(|w| w.as_str()).map(|s| s.to_string())
                        } else {
                            None
                        }
                    })
                    .unwrap_or_else(|| "".to_string());

                let timestamp_str = wr.get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or_else(|| {
                        // Use a static string for default timestamp - JSON will convert to string anyway
                        ""
                    });
                let timestamp = if timestamp_str.is_empty() {
                    chrono::Utc::now().to_rfc3339()
                } else {
                    timestamp_str.to_string()
                };
                
                serde_json::json!({
                    "participant_id": participant_id,
                    "experiment_id": session_uuid,
                    "word_stimulus_id": 1,
                    "stimulus_word": stimulus_word,
                    "response_word": wr.get("response_word").and_then(|v| v.as_str()).unwrap_or(""),
                    "reaction_time_ms": wr.get("reaction_time_ms").and_then(|v| v.as_i64()).unwrap_or(0),
                    "session": session_type,
                    "timestamp": timestamp,
                })
            }).collect();

            let responses_url = format!("{}/rest/v1/participant_response_data", self.url);
            let responses_response = self.client
                .post(&responses_url)
                .headers(self.headers())
                .json(&responses_to_insert)
                .send()
                .await?;

            let responses_status = responses_response.status();
            if !responses_status.is_success() {
                let error_text = responses_response.text().await.unwrap_or_default();
                return Err(anyhow!("Failed to save word responses: {} - {}", responses_status, error_text));
            }
        }

        Ok(session)
    }

    /// Get sessions by participant
    pub async fn get_sessions_by_participant(&self, participant_id: &str) -> Result<Vec<Value>> {
        let url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}&order=start_time.desc", 
            self.url, participant_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch sessions: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Get session events
    pub async fn get_session_events(&self, participant_id: &str, session_id: &str) -> Result<Vec<Value>> {
        // First, get session UUID
        let sessions_url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}&or=(session_id.eq.{},id.eq.{})&limit=1", 
            self.url, participant_id, session_id, session_id);
        let sessions_response = self.client
            .get(&sessions_url)
            .headers(self.headers())
            .send()
            .await?;

        if !sessions_response.status().is_success() {
            return Err(anyhow!("Failed to fetch session: {}", sessions_response.status()));
        }

        let sessions_data: Vec<Value> = sessions_response.json().await?;
        let session_uuid = sessions_data.into_iter().next()
            .and_then(|s| s.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .ok_or_else(|| anyhow!("Session not found: {}", session_id))?;

        // Get events
        let events_url = format!("{}/rest/v1/participant_session_events?participant_id=eq.{}&session_id=eq.{}&order=timestamp.asc", 
            self.url, participant_id, session_uuid);
        let events_response = self.client
            .get(&events_url)
            .headers(self.headers())
            .send()
            .await?;

        if !events_response.status().is_success() {
            return Err(anyhow!("Failed to fetch events: {}", events_response.status()));
        }

        let data: Vec<Value> = events_response.json().await?;
        Ok(data)
    }

    /// Save video to Supabase Storage
    pub async fn save_video(
        &self,
        participant_id: &str,
        session_id: &str,
        file_name: &str,
        file_data: &str, // base64 encoded
    ) -> Result<String> {
        use base64::{Engine as _, engine::general_purpose};
        
        // Decode base64
        let decoded = general_purpose::STANDARD.decode(file_data)
            .map_err(|e| anyhow!("Failed to decode base64: {}", e))?;

        // Get session UUID
        let sessions_url = format!("{}/rest/v1/participant_experiment_sessions?participant_id=eq.{}&or=(session_id.eq.{},id.eq.{})&limit=1", 
            self.url, participant_id, session_id, session_id);
        let sessions_response = self.client
            .get(&sessions_url)
            .headers(self.headers())
            .send()
            .await?;

        if !sessions_response.status().is_success() {
            return Err(anyhow!("Failed to fetch session: {}", sessions_response.status()));
        }

        let sessions_data: Vec<Value> = sessions_response.json().await?;
        let session_uuid = sessions_data.into_iter().next()
            .and_then(|s| s.get("id").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .ok_or_else(|| anyhow!("Session not found: {}", session_id))?;

        // Upload to Supabase Storage
        let storage_path = format!("{}/{}/{}", participant_id, session_uuid, file_name);
        let storage_url = format!("{}/storage/v1/object/participant-videos/{}", self.url, storage_path);

        let mut headers = self.headers();
        headers.remove("Content-Type");
        headers.insert(
            "Content-Type",
            "video/webm".parse().unwrap(),
        );

        let upload_response = self.client
            .post(&storage_url)
            .headers(headers)
            .body(decoded)
            .send()
            .await?;

        let upload_status = upload_response.status();
        if !upload_status.is_success() {
            let error_text = upload_response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to upload video: {} - {}", upload_status, error_text));
        }

        // Get public URL
        let public_url = format!("{}/storage/v1/object/public/participant-videos/{}", self.url, storage_path);

        // Update session metadata
        let update_url = format!("{}/rest/v1/participant_experiment_sessions?id=eq.{}", self.url, session_uuid);
        let update_data = serde_json::json!({
            "video_file_url": public_url,
            "video_file_name": file_name,
        });

        let _ = self.client
            .patch(&update_url)
            .headers(self.headers())
            .json(&update_data)
            .send()
            .await;

        Ok(public_url)
    }

    /// Get emotion results
    pub async fn get_emotion_results(&self, _participant_id: &str) -> Result<Vec<Value>> {
        // This would typically query a specific emotion results table
        // For now, we'll return empty array as placeholder
        // TODO: Implement when emotion results table structure is defined
        Ok(vec![])
    }

    /// Get emotion statistics
    pub async fn get_emotion_statistics(&self) -> Result<Value> {
        let url = format!("{}/rest/v1/participant_response_data?emotion=not.is.null&select=emotion", self.url);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch emotion data: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        
        // Aggregate emotions
        let mut emotion_map: std::collections::HashMap<String, (i32, i32)> = std::collections::HashMap::new();
        for item in &data {
            if let Some(emotion) = item.get("emotion").and_then(|v| v.as_str()) {
                let entry = emotion_map.entry(emotion.to_string()).or_insert((0, 0));
                entry.0 += 1;
                entry.1 += 1;
            }
        }

        let dominant_emotions: Vec<Value> = emotion_map.iter()
            .map(|(emotion, (count, total_score))| {
                serde_json::json!({
                    "emotion": emotion,
                    "count": count,
                    "averageScore": *total_score as f64 / *count as f64,
                })
            })
            .collect();

        Ok(serde_json::json!({
            "totalAnalyses": data.len(),
            "dominantEmotions": dominant_emotions,
        }))
    }

    /// Get all projects
    pub async fn get_projects(
        &self,
        status: Option<&str>,
        created_by: Option<&str>,
        search: Option<&str>,
    ) -> Result<Vec<Value>> {
        let mut url = format!("{}/rest/v1/projects?order=created_at.desc", self.url);
        
        let mut params = Vec::new();
        if let Some(s) = status {
            params.push(format!("status=eq.{}", s));
        }
        if let Some(cb) = created_by {
            params.push(format!("created_by=eq.{}", cb));
        }
        
        if !params.is_empty() {
            url = format!("{}/rest/v1/projects?{}&order=created_at.desc", 
                self.url, params.join("&"));
        }

        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch projects: {}", response.status()));
        }

        let mut data: Vec<Value> = response.json().await?;
        
        // Filter by search if provided (client-side filter for text search)
        if let Some(search_term) = search {
            data.retain(|p| {
                let name = p.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let description = p.get("description").and_then(|v| v.as_str()).unwrap_or("");
                name.to_lowercase().contains(&search_term.to_lowercase()) ||
                description.to_lowercase().contains(&search_term.to_lowercase())
            });
        }

        Ok(data)
    }

    /// Get project by ID
    pub async fn get_project(&self, project_id: &str) -> Result<Value> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.url, project_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch project: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Project {} not found", project_id))
    }

    /// Create project
    pub async fn create_project(
        &self,
        name: &str,
        description: Option<&str>,
        purpose: Option<&str>,
        status: &str,
        created_by: &str,
    ) -> Result<Value> {
        let mut project_data = serde_json::json!({
            "name": name,
            "status": status,
            "created_by": created_by,
        });

        if let Some(d) = description {
            project_data["description"] = d.into();
        }
        if let Some(p) = purpose {
            project_data["purpose"] = p.into();
        }

        let url = format!("{}/rest/v1/projects", self.url);
        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&project_data)
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to create project: {} - {}", status_code, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to create project: empty response"))
    }

    /// Update project
    pub async fn update_project(
        &self,
        project_id: &str,
        name: Option<&str>,
        description: Option<&str>,
        purpose: Option<&str>,
        status: Option<&str>,
    ) -> Result<Value> {
        let mut update_data = serde_json::json!({});
        
        if let Some(n) = name {
            update_data["name"] = n.into();
        }
        if let Some(d) = description {
            update_data["description"] = d.into();
        }
        if let Some(p) = purpose {
            update_data["purpose"] = p.into();
        }
        if let Some(s) = status {
            update_data["status"] = s.into();
        }

        let url = format!("{}/rest/v1/projects?id=eq.{}", self.url, project_id);
        let response = self.client
            .patch(&url)
            .headers(self.headers())
            .json(&update_data)
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to update project: {} - {}", status_code, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Project not found"))
    }

    /// Delete project
    pub async fn delete_project(&self, project_id: &str) -> Result<()> {
        let url = format!("{}/rest/v1/projects?id=eq.{}", self.url, project_id);
        let response = self.client
            .delete(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to delete project: {}", response.status()));
        }

        Ok(())
    }

    /// Get project stats
    pub async fn get_project_stats(&self, project_id: &str) -> Result<Option<Value>> {
        let url = format!("{}/rest/v1/project_stats?project_id=eq.{}", self.url, project_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch project stats: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data.into_iter().next())
    }

    /// Get project participants
    pub async fn get_project_participants(&self, project_id: &str) -> Result<Vec<Value>> {
        let url = format!(
            "{}/rest/v1/project_participants?project_id=eq.{}&select=*,participant:participants(id,name,created_at)&order=joined_at.desc",
            self.url, project_id
        );
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch project participants: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data)
    }

    /// Add participant to project
    pub async fn add_participant_to_project(
        &self,
        project_id: &str,
        participant_id: &str,
    ) -> Result<()> {
        let url = format!("{}/rest/v1/project_participants", self.url);
        let data = serde_json::json!({
            "project_id": project_id,
            "participant_id": participant_id,
        });

        let response = self.client
            .post(&url)
            .headers(self.headers())
            .json(&data)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to add participant to project: {} - {}", response.status(), error_text));
        }

        Ok(())
    }

    /// Remove participant from project
    pub async fn remove_participant_from_project(
        &self,
        project_id: &str,
        participant_id: &str,
    ) -> Result<()> {
        let url = format!(
            "{}/rest/v1/project_participants?project_id=eq.{}&participant_id=eq.{}",
            self.url, project_id, participant_id
        );
        let response = self.client
            .delete(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to remove participant from project: {}", response.status()));
        }

        Ok(())
    }

    /// Get experiment config
    pub async fn get_experiment_config(&self, project_id: &str) -> Result<Option<Value>> {
        let url = format!("{}/rest/v1/experiment_configs?project_id=eq.{}", self.url, project_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch experiment config: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data.into_iter().next())
    }

    /// Save experiment config
    pub async fn save_experiment_config(
        &self,
        project_id: &str,
        config: &Value,
    ) -> Result<Value> {
        let mut config_data = serde_json::json!({
            "project_id": project_id,
            "session_types": config["session_types"],
            "word_list": config["word_list"],
            "session_parameters": config["session_parameters"],
            "analysis_parameters": config["analysis_parameters"],
        });

        let url = format!("{}/rest/v1/experiment_configs", self.url);
        let response = self.client
            .post(&url)
            .headers({
                let mut headers = self.headers();
                headers.insert("Prefer", "resolution=merge-duplicates".parse().unwrap());
                headers
            })
            .json(&config_data)
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to save experiment config: {} - {}", status_code, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to save experiment config: empty response"))
    }

    /// Get project workflow
    pub async fn get_project_workflow(&self, project_id: &str) -> Result<Option<Value>> {
        let url = format!("{}/rest/v1/project_workflows?project_id=eq.{}", self.url, project_id);
        let response = self.client
            .get(&url)
            .headers(self.headers())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to fetch project workflow: {}", response.status()));
        }

        let data: Vec<Value> = response.json().await?;
        Ok(data.into_iter().next())
    }

    /// Save project workflow
    pub async fn save_project_workflow(
        &self,
        project_id: &str,
        workflow_data: &Value,
    ) -> Result<Value> {
        let workflow_json = serde_json::json!({
            "project_id": project_id,
            "workflow_data": workflow_data,
        });

        let url = format!("{}/rest/v1/project_workflows", self.url);
        let response = self.client
            .post(&url)
            .headers({
                let mut headers = self.headers();
                headers.insert("Prefer", "resolution=merge-duplicates".parse().unwrap());
                headers
            })
            .json(&workflow_json)
            .send()
            .await?;

        let status_code = response.status();
        if !status_code.is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to save project workflow: {} - {}", status_code, error_text));
        }

        let data: Vec<Value> = response.json().await?;
        data.into_iter().next()
            .ok_or_else(|| anyhow!("Failed to save project workflow: empty response"))
    }
}

