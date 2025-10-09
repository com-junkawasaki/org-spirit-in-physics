from terminusdb_client import WOQLClient, WOQLQuery
import logging
import os

class DataLoader:
    """Data loader for analyzer using TerminusDB"""

    def __init__(self, config):
        self.client = WOQLClient(
            server=config['url'],
            user=config['user'],
            password=config['password']
        )
        self.database_id = config['database_id']
        self.client.connect(self.database_id)
        logging.info("DataLoader initialized and TerminusDB client connected.")

    def get_unprocessed_responses(self, limit=100):
        """Get responses that haven't been processed yet"""
        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple("v:Response", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple("v:Response", "scm:id", "v:Id"),
                WOQLQuery().triple("v:Response", "scm:stimulus_word", "v:StimulusWord"),
                WOQLQuery().triple("v:Response", "scm:response_word", "v:ResponseWord"),
                WOQLQuery().triple("v:Response", "scm:reaction_time_ms", "v:ReactionTime"),
                WOQLQuery().triple("v:Response", "belongs_to_participant", "v:Participant"),
                WOQLQuery().limit(limit)
            )

            result = self.client.query(query)
            responses = []

            for binding in result.get("bindings", []):
                response_data = {
                    "id": binding.get("Id", {}).get("@value"),
                    "stimulus_word": binding.get("StimulusWord", {}).get("@value"),
                    "response_word": binding.get("ResponseWord", {}).get("@value"),
                    "reaction_time_ms": int(binding.get("ReactionTime", {}).get("@value", 0)),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                responses.append(response_data)

            logging.info(f"Found {len(responses)} responses.")
            return responses

        except Exception as e:
            logging.error(f"Failed to fetch unprocessed responses: {e}")
            return []

    def get_experiment_session_for_response(self, response_id):
        """Get experiment session for a given response"""
        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "belongs_to_session", "v:Session"),
                WOQLQuery().triple("v:Session", "rdf:type", "scm:ExperimentSession"),
                WOQLQuery().triple("v:Session", "scm:id", "v:SessionId"),
                WOQLQuery().triple("v:Session", "scm:session_type", "v:SessionType"),
                WOQLQuery().triple("v:Session", "scm:start_time", "v:StartTime").opt(),
                WOQLQuery().triple("v:Session", "scm:end_time", "v:EndTime").opt(),
                WOQLQuery().triple("v:Session", "belongs_to_participant", "v:Participant")
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                session_data = {
                    "id": binding.get("SessionId", {}).get("@value"),
                    "session_type": binding.get("SessionType", {}).get("@value"),
                    "start_time": binding.get("StartTime", {}).get("@value"),
                    "end_time": binding.get("EndTime", {}).get("@value"),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                return session_data
            else:
                logging.warning(f"No experiment session found for response {response_id}")
                return None

        except Exception as e:
            logging.error(f"Failed to fetch experiment session for response {response_id}: {e}")
            return None

    def get_response(self, response_id):
        """Get response data by ID"""
        try:
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "rdf:type", "scm:ResponseData"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:id", "v:Id"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:stimulus_word", "v:StimulusWord"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:response_word", "v:ResponseWord"),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:audio_file_path", "v:AudioPath").opt(),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:video_file_path", "v:VideoPath").opt(),
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "belongs_to_participant", "v:Participant")
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                response_data = {
                    "id": binding.get("Id", {}).get("@value"),
                    "stimulus_word": binding.get("StimulusWord", {}).get("@value"),
                    "response_word": binding.get("ResponseWord", {}).get("@value"),
                    "audio_file_path": binding.get("AudioPath", {}).get("@value"),
                    "video_file_path": binding.get("VideoPath", {}).get("@value"),
                    "participant_id": binding.get("Participant", {}).get("@value", "").split("/")[-1] if binding.get("Participant") else None
                }
                return response_data
            else:
                logging.warning(f"Response {response_id} not found.")
                return None

        except Exception as e:
            logging.error(f"Failed to fetch response {response_id}: {e}")
            return None

    def load_skin_potential_data(self, response_id):
        """Load skin potential timeseries data for a response"""
        try:
            # For now, return the skin_potential value directly from the response
            # In the future, this could be extended to handle time-series data
            query = WOQLQuery().woql_and(
                WOQLQuery().triple(f"terminusdb:///data/ResponseData/{response_id}", "scm:skin_potential", "v:SkinPotential").opt()
            )

            result = self.client.query(query)

            if result.get("bindings") and len(result["bindings"]) > 0:
                binding = result["bindings"][0]
                skin_potential = binding.get("SkinPotential", {}).get("@value")

                if skin_potential is not None:
                    logging.info(f"Loaded skin potential data for response {response_id}")
                    return [{"value": float(skin_potential), "timestamp_offset_ms": 0}]
                else:
                    logging.info(f"No skin potential data found for response {response_id}")
                    return []
            else:
                logging.info(f"No skin potential data found for response {response_id}")
                return []

        except Exception as e:
            logging.error(f"Failed to load skin potential data for response {response_id}: {e}")
            return []
