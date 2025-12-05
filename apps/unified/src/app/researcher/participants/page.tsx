import AppShell from '@/components/researcher/AppShell';
import { ParticipantOverview } from '@/components/researcher/ParticipantOverview';
import ParticipantsBreadcrumb from '@/components/researcher/navigation/Breadcrumb';
import { PageLayout } from '@/components/researcher/layout/PageLayout';

export default function ParticipantsPage() {
  return (
    <AppShell>
      <div className="container container-ipad mx-auto px-3 md:px-4 py-4 md:py-6">
        <ParticipantsBreadcrumb />
      </div>
      <PageLayout
        header={{
          title: '参加者一覧',
          description: '研究参加者のデータを管理・閲覧します'
        }}
      >
        <ParticipantOverview />
      </PageLayout>
    </AppShell>
  );
}
