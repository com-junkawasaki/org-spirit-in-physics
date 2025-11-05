//! GraphQL Usage Example
//! 
//! Merkle DAG: graphql.example
//! OWL: spirit:GraphQL Service Port usage example

'use client';

import { useParticipants, useParticipant, useSessions, useAnalysisResults, useExecuteActivity } from './hooks';

/**
 * Example: Participants List Component
 */
export function ParticipantsListExample() {
  const { data, loading, error } = useParticipants();

  if (loading) return <div>Loading participants...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Participants</h2>
      <ul>
        {data?.participants.map((participant) => (
          <li key={participant.id}>
            ID: {participant.id}, Age: {participant.age ?? 'N/A'}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Participant Detail Component
 */
export function ParticipantDetailExample({ participantId }: { participantId: string }) {
  const { data, loading, error } = useParticipant(participantId);

  if (loading) return <div>Loading participant...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const participant = data?.participant;
  if (!participant) return <div>Participant not found</div>;

  return (
    <div>
      <h2>Participant: {participant.id}</h2>
      <p>Age: {participant.age ?? 'N/A'}</p>
      <p>Gender: {participant.gender ?? 'N/A'}</p>
    </div>
  );
}

/**
 * Example: Sessions List Component
 */
export function SessionsListExample({ participantId }: { participantId?: string }) {
  const { data, loading, error } = useSessions(participantId);

  if (loading) return <div>Loading sessions...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Sessions</h2>
      <ul>
        {data?.sessions.map((session) => (
          <li key={session.id}>
            {session.sessionType} - {session.startTime}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Analysis Results Component
 */
export function AnalysisResultsExample({
  participantId,
  experimentId,
}: {
  participantId?: string;
  experimentId?: string;
}) {
  const { data, loading, error } = useAnalysisResults(participantId, experimentId);

  if (loading) return <div>Loading analysis results...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Analysis Results</h2>
      <ul>
        {data?.analysisResults.map((result) => (
          <li key={result.id}>
            {result.stimulusWord} → {result.responseWord}: {result.spiritProbability.toFixed(4)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Example: Activity Execution Component
 */
export function ActivityExecutionExample() {
  const [executeActivity, { loading, error }] = useExecuteActivity();

  const handleExecute = async () => {
    try {
      const result = await executeActivity({
        variables: {
          activityId: 'https://spirit-in-physics.gftd.ai/activity/AnalysisProcess',
          inputs: [
            {
              id: 'word-response-1',
              type: 'https://spirit-in-physics.gftd.ai/ontology#WordResponse',
              data: {
                stimulusWord: '水',
                responseWord: '海',
                reactionTimeMs: 1200,
                word2vecComponent: 0.8,
                emotionComponent: 0.7,
              },
            },
          ],
        },
      });

      if (result.data?.executeActivity.success) {
        console.log('Activity executed successfully:', result.data.executeActivity.result);
      } else {
        console.error('Activity execution failed:', result.data?.executeActivity.error);
      }
    } catch (err) {
      console.error('Error executing activity:', err);
    }
  };

  return (
    <div>
      <button onClick={handleExecute} disabled={loading}>
        {loading ? 'Executing...' : 'Execute Analysis Activity'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}

