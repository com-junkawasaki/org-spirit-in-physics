"use client";

import { ResearchParticipationConsent } from "@/components/ui/ResearchParticipationConsent";

export default function DebugPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Component Isolation Test</h1>
      <ResearchParticipationConsent />
    </div>
  );
} 