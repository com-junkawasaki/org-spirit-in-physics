import { DashboardLayout } from '@/components/layout/PageLayout';
import { createGraphQLClient } from '@/lib/graphql-client';

interface ParticipantDetailPageProps {
  params: {
    id: string;
  };
}

async function ParticipantDetailContent({ participantId }: { participantId: string }) {
  const client = createGraphQLClient();
  const participant = await client.getParticipantDetails(participantId);

  if (!participant) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Participant not found or data could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Sessions</h3>
          <p className="text-3xl font-bold text-gray-900">{participant.sessionCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Responses</h3>
          <p className="text-3xl font-bold text-gray-900">{participant.responseCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Emotion Data</h3>
          <p className="text-3xl font-bold text-gray-900">{participant.emotionDataCount ?? 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Physiological Data</h3>
          <p className="text-3xl font-bold text-gray-900">{participant.physiologicalDataCount ?? 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Participant Information</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{participant.id}</dd>
          </div>
          {participant.age && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Age</dt>
              <dd className="mt-1 text-sm text-gray-900">{participant.age}</dd>
            </div>
          )}
          {participant.gender && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900">{participant.gender}</dd>
            </div>
          )}
          {participant.handedness && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Handedness</dt>
              <dd className="mt-1 text-sm text-gray-900">{participant.handedness}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {participant.createdAt ? new Date(participant.createdAt).toLocaleString() : 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Updated At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {participant.updatedAt ? new Date(participant.updatedAt).toLocaleString() : 'N/A'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Timeline Visualization</h2>
        <p className="text-gray-500">Timeline visualization component is temporarily disabled.</p>
      </div>
    </div>
  );
}

export default async function ParticipantDetailPage({ params }: ParticipantDetailPageProps) {
  const participantId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!participantId) {
    return (
      <DashboardLayout
        header={{
          title: 'Participant Not Found',
          backHref: '/participants',
          backLabel: 'Back to Participants'
        }}
      >
        <div className="container mx-auto py-8">
          <p>Participant ID is required.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: `Participant: ${participantId.slice(0, 8)}...`,
        backHref: '/participants',
        backLabel: 'Back to Participants'
      }}
    >
      <ParticipantDetailContent participantId={participantId} />
    </DashboardLayout>
  );
}


