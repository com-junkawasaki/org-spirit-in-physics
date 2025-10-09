#!/usr/bin/env python3
"""
TerminusDB Data Access Layer for Spirit in Physics experiment data.
Provides CRUD operations and query methods.
"""

import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from terminusdb_client import WOQLClient, WOQLQuery

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TerminusDBDataAccess:
    """Data access layer for TerminusDB operations."""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = None
        self.database_id = config.get('database_id', 'spirit_in_physics')

    def connect(self) -> bool:
        """Connect to TerminusDB."""
        try:
            if not self.client:
                self.client = WOQLClient(
                    server=self.config.get('url', 'http://localhost:6363'),
                    user=self.config.get('user', 'admin'),
                    password=self.config.get('password', 'root')
                )

            # Create database if it doesn't exist
            if self.database_id not in self.client.list_databases():
                self.client.create_database(self.database_id, "Spirit in Physics Experiment Database")

            self.client.connect(self.database_id)
            logger.info(f"Connected to TerminusDB database: {self.database_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to TerminusDB: {e}")
            return False

    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
            logger.info("TerminusDB connection closed")

    # Participant operations
    def create_participant(self, participant_data: Dict[str, Any]) -> bool:
        """Create a new participant."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        participant_id = participant_data.get("id")
        if not participant_id:
            raise ValueError("Participant ID is required")

        participant_iri = f"terminusdb:///data/Participant/{participant_id}"

        participant_doc = {
            "@type": "Participant",
            "@id": participant_iri,
            "id": participant_id,
            "age": participant_data.get("age"),
            "gender": participant_data.get("gender"),
            "handedness": participant_data.get("handedness"),
            "created_at": participant_data.get("created_at", datetime.now().isoformat()),
            "updated_at": participant_data.get("updated_at", datetime.now().isoformat())
        }

        # Remove None values
        participant_doc = {k: v for k, v in participant_doc.items() if v is not None}

        try:
            query = WOQLQuery().insert(participant_doc)
            self.client.query(query)
            logger.info(f"Created participant: {participant_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to create participant {participant_id}: {e}")
            return False

    def get_participant(self, participant_id: str) -> Optional[Dict[str, Any]]:
        """Get participant by ID."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "rdf:type", "scm:Participant"),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:id", "v:Id"),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:age", "v:Age").opt(),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:gender", "v:Gender").opt(),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:handedness", "v:Handedness").opt(),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:created_at", "v:CreatedAt").opt(),
                WOQLQuery().triple(f"terminusdb:///data/Participant/{participant_id}", "scm:updated_at", "v:UpdatedAt").opt()
            )

            result = self.client.query(query)
            if result.get("bindings"):
                binding = result["bindings"][0]
                return {
                    "id": binding.get("Id", {}).get("@value"),
                    "age": binding.get("Age", {}).get("@value"),
                    "gender": binding.get("Gender", {}).get("@value"),
                    "handedness": binding.get("Handedness", {}).get("@value"),
                    "created_at": binding.get("CreatedAt", {}).get("@value"),
                    "updated_at": binding.get("UpdatedAt", {}).get("@value")
                }
        except Exception as e:
            logger.error(f"Failed to get participant {participant_id}: {e}")

        return None

    def update_participant(self, participant_id: str, update_data: Dict[str, Any]) -> bool:
        """Update participant data."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        participant_iri = f"terminusdb:///data/Participant/{participant_id}"
        update_data["updated_at"] = datetime.now().isoformat()

        try:
            query = WOQLQuery().update_object(update_data).id(participant_iri)
            self.client.query(query)
            logger.info(f"Updated participant: {participant_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update participant {participant_id}: {e}")
            return False

    def delete_participant(self, participant_id: str) -> bool:
        """Delete participant and all related data."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        participant_iri = f"terminusdb:///data/Participant/{participant_id}"

        try:
            # Delete related data first
            self._delete_related_data(participant_iri)

            # Delete participant
            query = WOQLQuery().delete_object(participant_iri)
            self.client.query(query)
            logger.info(f"Deleted participant: {participant_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete participant {participant_id}: {e}")
            return False

    def _delete_related_data(self, participant_iri: str):
        """Delete all data related to a participant."""
        # Delete consents
        query = WOQLQuery().woql_and(
            WOQLQuery().triple("v:Consent", "belongs_to_participant", participant_iri),
            WOQLQuery().delete_object("v:Consent")
        )
        self.client.query(query)

        # Delete sessions and their related data
        query = WOQLQuery().woql_and(
            WOQLQuery().triple("v:Session", "belongs_to_participant", participant_iri),
            WOQLQuery().delete_object("v:Session")
        )
        self.client.query(query)

        # Delete responses
        query = WOQLQuery().woql_and(
            WOQLQuery().triple("v:Response", "belongs_to_participant", participant_iri),
            WOQLQuery().delete_object("v:Response")
        )
        self.client.query(query)

    # Experiment Session operations
    def create_experiment_session(self, session_data: Dict[str, Any]) -> bool:
        """Create a new experiment session."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        session_id = session_data.get("id")
        participant_id = session_data.get("participant_id")
        if not session_id or not participant_id:
            raise ValueError("Session ID and participant ID are required")

        session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"
        participant_iri = f"terminusdb:///data/Participant/{participant_id}"

        session_doc = {
            "@type": "ExperimentSession",
            "@id": session_iri,
            "id": session_id,
            "session_type": session_data.get("session_type"),
            "start_time": session_data.get("start_time"),
            "end_time": session_data.get("end_time"),
            "created_at": session_data.get("created_at", datetime.now().isoformat()),
            "updated_at": session_data.get("updated_at", datetime.now().isoformat()),
            "belongs_to_participant": participant_iri
        }

        # Remove None values
        session_doc = {k: v for k, v in session_doc.items() if v is not None}

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(session_doc),
                WOQLQuery().link(participant_iri, "has_session", session_iri)
            )
            self.client.query(query)
            logger.info(f"Created experiment session: {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to create experiment session {session_id}: {e}")
            return False

    def get_experiment_sessions(self, participant_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get experiment sessions, optionally filtered by participant."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        try:
            if participant_id:
                participant_iri = f"terminusdb:///data/Participant/{participant_id}"
                query = WOQLQuery().woql_and(
                    WOQLQuery().triple("v:Session", "belongs_to_participant", participant_iri),
                    WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                    WOQLQuery().triple("v:Session", "scm:id", "v:Id"),
                    WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType").opt(),
                    WOQLQuery().triple("v:Session", "scm:start_time", "v:StartTime").opt(),
                    WOQLQuery().triple("v:Session", "scm:end_time", "v:EndTime").opt(),
                    WOQLQuery().limit(limit)
                )
            else:
                query = WOQLQuery().woql_and(
                    WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                    WOQLQuery().triple("v:Session", "scm:id", "v:Id"),
                    WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType").opt(),
                    WOQLQuery().triple("v:Session", "scm:start_time", "v:StartTime").opt(),
                    WOQLQuery().triple("v:Session", "scm:end_time", "v:EndTime").opt(),
                    WOQLQuery().limit(limit)
                )

            result = self.client.query(query)
            sessions = []

            for binding in result.get("bindings", []):
                sessions.append({
                    "id": binding.get("Id", {}).get("@value"),
                    "session_type": binding.get("SessionType", {}).get("@value"),
                    "start_time": binding.get("StartTime", {}).get("@value"),
                    "end_time": binding.get("EndTime", {}).get("@value")
                })

            return sessions
        except Exception as e:
            logger.error(f"Failed to get experiment sessions: {e}")
            return []

    # Response Data operations
    def create_response_data(self, response_data: Dict[str, Any]) -> bool:
        """Create new response data."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        response_id = response_data.get("id")
        participant_id = response_data.get("participant_id")
        experiment_id = response_data.get("experiment_id")
        word_stimulus_id = response_data.get("word_stimulus_id")

        if not all([response_id, participant_id, experiment_id]):
            raise ValueError("Response ID, participant ID, and experiment ID are required")

        response_iri = f"terminusdb:///data/ResponseData/{response_id}"
        participant_iri = f"terminusdb:///data/Participant/{participant_id}"
        session_iri = f"terminusdb:///data/ExperimentSession/{experiment_id}"
        stimulus_iri = f"terminusdb:///data/WordStimulus/{word_stimulus_id}" if word_stimulus_id else None

        response_doc = {
            "@type": "ResponseData",
            "@id": response_iri,
            "id": response_id,
            "stimulus_word": response_data.get("stimulus_word"),
            "response_word": response_data.get("response_word"),
            "reaction_time_ms": response_data.get("reaction_time_ms"),
            "timestamp": response_data.get("timestamp"),
            "audio_file_path": response_data.get("audio_file_path"),
            "video_file_path": response_data.get("video_file_path"),
            "skin_potential": response_data.get("skin_potential"),
            "emotion": response_data.get("emotion"),
            "emotion_confidence": response_data.get("emotion_confidence"),
            "created_at": response_data.get("created_at", datetime.now().isoformat()),
            "updated_at": response_data.get("updated_at", datetime.now().isoformat()),
            "belongs_to_participant": participant_iri,
            "belongs_to_session": session_iri
        }

        if stimulus_iri:
            response_doc["uses_stimulus"] = stimulus_iri

        # Remove None values
        response_doc = {k: v for k, v in response_doc.items() if v is not None}

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().insert(response_doc),
                WOQLQuery().link(participant_iri, "has_response", response_iri)
            )
            self.client.query(query)
            logger.info(f"Created response data: {response_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to create response data {response_id}: {e}")
            return False

    def get_response_data(self, participant_id: Optional[str] = None, session_id: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get response data with optional filtering."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        try:
            base_query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Response", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple("v:Response", "scm:id", "v:Id"),
                WOQLQuery().triple("v:Response", "scm:stimulus_word", "v:StimulusWord").opt(),
                WOQLQuery().triple("v:Response", "scm:response_word", "v:ResponseWord").opt(),
                WOQLQuery().triple("v:Response", "scm:reaction_time_ms", "v:ReactionTime").opt(),
                WOQLQuery().triple("v:Response", "scm:emotion", "v:Emotion").opt(),
                WOQLQuery().triple("v:Response", "scm:emotion_confidence", "v:EmotionConfidence").opt()
            )

            if participant_id:
                participant_iri = f"terminusdb:///data/Participant/{participant_id}"
                base_query = WOQLQuery().woql_and(
                    base_query,
                    WOQLQuery().triple("v:Response", "belongs_to_participant", participant_iri)
                )

            if session_id:
                session_iri = f"terminusdb:///data/ExperimentSession/{session_id}"
                base_query = WOQLQuery().woql_and(
                    base_query,
                    WOQLQuery().triple("v:Response", "belongs_to_session", session_iri)
                )

            query = WOQLQuery().woql_and(base_query, WOQLQuery().limit(limit))

            result = self.client.query(query)
            responses = []

            for binding in result.get("bindings", []):
                responses.append({
                    "id": binding.get("Id", {}).get("@value"),
                    "stimulus_word": binding.get("StimulusWord", {}).get("@value"),
                    "response_word": binding.get("ResponseWord", {}).get("@value"),
                    "reaction_time_ms": binding.get("ReactionTime", {}).get("@value"),
                    "emotion": binding.get("Emotion", {}).get("@value"),
                    "emotion_confidence": binding.get("EmotionConfidence", {}).get("@value")
                })

            return responses
        except Exception as e:
            logger.error(f"Failed to get response data: {e}")
            return []

    # Analytics queries
    def get_participants_summary(self) -> Dict[str, Any]:
        """Get summary statistics for participants."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        try:
            # Count total participants
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Participant", "rdf:type", "scm:Participant"),
                WOQLQuery().count("v:Participant", "v:Count")
            )

            result = self.client.query(query)
            total_participants = result.get("bindings", [{}])[0].get("Count", {}).get("@value", 0)

            # Count sessions per participant
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Session", "belongs_to_participant", "v:Participant"),
                WOQLQuery().group_by("v:Participant", ["v:Participant"], "v:SessionCount",
                                    WOQLQuery().count("v:Session", "v:SessionCount"))
            )

            result = self.client.query(query)
            session_counts = [int(binding.get("SessionCount", {}).get("@value", 0))
                            for binding in result.get("bindings", [])]

            return {
                "total_participants": int(total_participants),
                "total_sessions": sum(session_counts),
                "average_sessions_per_participant": sum(session_counts) / len(session_counts) if session_counts else 0
            }
        except Exception as e:
            logger.error(f"Failed to get participants summary: {e}")
            return {}

    def get_emotion_distribution(self) -> Dict[str, int]:
        """Get distribution of emotions in response data."""
        if not self.client:
            raise ConnectionError("Not connected to TerminusDB")

        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Response", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple("v:Response", "scm:emotion", "v:Emotion"),
                WOQLQuery().group_by("v:Emotion", ["v:Emotion"], "v:Count",
                                    WOQLQuery().count("v:Response", "v:Count"))
            )

            result = self.client.query(query)
            distribution = {}

            for binding in result.get("bindings", []):
                emotion = binding.get("Emotion", {}).get("@value")
                count = int(binding.get("Count", {}).get("@value", 0))
                if emotion:
                    distribution[emotion] = count

            return distribution
        except Exception as e:
            logger.error(f"Failed to get emotion distribution: {e}")
            return {}
