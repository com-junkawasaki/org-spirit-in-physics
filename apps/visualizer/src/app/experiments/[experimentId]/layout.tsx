import Link from 'next/link'

// Merkle DAG: experiment_tabs_layout -> tab_navigation_structure
export default function ExperimentTabsLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode
  params: { experimentId: string }
}) {
  const base = `/experiments/${params.experimentId}`
  const tabs = [
    { href: base, label: '概要' },
    { href: `${base}/sessions`, label: 'セッション' },
    { href: `${base}/participants`, label: '参加者' },
    { href: `${base}/analysis`, label: '分析' },
    { href: `${base}/timeline`, label: '時系列' },
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
