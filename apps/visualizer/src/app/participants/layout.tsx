// Merkle DAG: participants_section_layout -> section_wrapper_container
export default function ParticipantsSectionLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      {children}
    </div>
  )
}
