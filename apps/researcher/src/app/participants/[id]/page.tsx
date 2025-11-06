'use client';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/PageLayout';
// import { TimelineVisualization } from '@visualizer'

export default function ForceTimelinePage() {
  const params = useParams();
  // The id can be a string or an array of strings, so we handle both cases.
  const participantId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!participantId) {
    return <div>Loading participant data...</div>;
  }

  return (
    <DashboardLayout
      header={{
        title: `Participant Timeline: ${participantId}`,
        backHref: '/participants',
        backLabel: 'Back to Participants'
      }}
    >
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">
          Participant Timeline: {participantId}
        </h1>
        <div className="bg-white p-4 rounded-lg shadow-md">
          {/* <TimelineVisualization
            participantId={participantId}
            width={1000}
            height={600}
          /> */}
          <p>Visualization component is temporarily disabled.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}


