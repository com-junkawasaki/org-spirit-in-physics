import Link from 'next/link'

// Merkle DAG: participant_tabs_layout -> tab_navigation_structure
export default function ParticipantTabsLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode
  params: { id: string }
}) {
  const base = `/participants/${params.id}`
  const tabs = [
    { href: base, label: '概要' },
    { href: `${base}/results`, label: '結果' },
    { href: `${base}/timeline`, label: '時系列' },
    { href: `${base}/vectors`, label: 'ベクトル' },
    { href: `${base}/correlation`, label: '相関' },
    { href: `${base}/report`, label: 'レポート' },
  ]

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b">
        {tabs.map(tab => (
          <Link 
            key={tab.href} 
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
