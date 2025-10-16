'use client'

import { useSidebar } from '@/contexts/SidebarContext'

// Merkle DAG: sidebar_layout -> navigation_menu_structure
interface MenuItem {
    id: string
    label: string
    href: string
    icon: string
    description: string
}

const menuItems: MenuItem[] = [
    {
        id: 'dashboard',
        label: 'ダッシュボード',
        href: '/dashboard',
        icon: '📊',
        description: 'システム概要と統計'
    },
    {
        id: 'system-metrics',
        label: 'システムメトリクス',
        href: '/system-metrics',
        icon: '📈',
        description: 'システムパフォーマンス監視'
    },
    {
        id: 'participants',
        label: '被験者一覧',
        href: '/participants',
        icon: '👥',
        description: '参加者データ管理'
    },
    {
        id: 'procs',
        label: 'プロセス',
        href: '/procs',
        icon: '🧩',
        description: 'BPMN 可視化・実行'
    },
    {
        id: 'process-participants',
        label: '参加者インポート',
        href: '/process/participants',
        icon: '👤',
        description: '参加者データインポート'
    },
    {
        id: 'process-sessions',
        label: 'セッションインポート',
        href: '/process/sessions',
        icon: '📋',
        description: 'セッションデータインポート'
    },
    {
        id: 'process-emotions',
        label: '感情データインポート',
        href: '/process/emotions',
        icon: '😊',
        description: '感情分析データインポート'
    },
    {
        id: 'process-emotions-integrated',
        label: '統合感情データインポート',
        href: '/process/emotions-integrated',
        icon: '🎭',
        description: 'BPMN統合感情データインポート'
    },
    {
        id: 'process-physiological',
        label: '生理データインポート',
        href: '/process/physiological',
        icon: '💓',
        description: '生理データインポート'
    },
    {
        id: 'analysis-pipeline',
        label: '解析パイプライン',
        href: '/analysis/pipeline',
        icon: '🔬',
        description: '統合解析パイプライン'
    },
    {
        id: 'session-comparison',
        label: 'セッション比較分析',
        href: '/analysis/session-comparison',
        icon: '📊',
        description: 'セッション間差異分析'
    },
    {
        id: 'integrated-pipeline',
        label: '統合パイプライン',
        href: '/pipeline/integrated',
        icon: '🚀',
        description: 'データインポートから解析まで'
    },
    {
        id: 'import',
        label: 'インポート管理',
        href: '/import',
        icon: '📥',
        description: 'データインポート処理'
    }
]

export function Sidebar() {
    const { sidebarOpen, setSidebarOpen } = useSidebar()

    return (
        <aside
            className={`
        ${sidebarOpen ? 'w-64' : 'w-16'}
        fixed lg:static inset-y-0 left-0 z-50
        bg-card border-r transition-all duration-300 ease-in-out
        flex flex-col
      `}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b">
                {sidebarOpen && (
                    <div className="flex items-center space-x-2">
                        <h1 className="text-xl font-bold text-primary">
                            Spirit in Physics
                        </h1>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
                >
                    <span className="text-lg">
                        {sidebarOpen ? '◀' : '▶'}
                    </span>
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => (
                    <a
                        key={item.id}
                        href={item.href}
                        className={`
                  flex items-center space-x-3 p-3 rounded-lg
                  hover:bg-muted transition-colors group
                  ${sidebarOpen ? 'justify-start' : 'justify-center'}
                `}
                        title={sidebarOpen ? '' : item.description}
                    >
                        <span className="text-xl">{item.icon}</span>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{item.label}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {item.description}
                                </div>
                            </div>
                        )}
                    </a>
                ))}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-4 border-t">
                {sidebarOpen ? (
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-muted-foreground">
                                Real-time Analytics
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            © 2024 Spirit in Physics Research
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                )}
            </div>
        </aside>
    )
}
