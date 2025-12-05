'use client'

import { useSidebar } from '@/contexts/SidebarContext'
import * as m from '@/paraglide/messages'

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
        label: m.dashboard(),
        href: '/researcher',
        icon: '📊',
        description: m.system_overview_stats()
    },
    {
        id: 'participants',
        label: m.participant_list(),
        href: '/researcher/participants',
        icon: '👥',
        description: m.participant_data_management()
    }
]

export function Sidebar() {
    const { sidebarOpen, setSidebarOpen } = useSidebar()

    return (
        <aside
            className={`
        ${sidebarOpen ? 'w-60 md:w-64' : 'w-14 md:w-16'}
        fixed lg:static inset-y-0 left-0 z-50
        bg-card border-r transition-all duration-300 ease-in-out
        flex flex-col
      `}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b">
                {sidebarOpen && (
                    <div className="flex items-center space-x-2">
                        <h1 className="text-lg md:text-xl font-bold text-primary">
                            Spirit in Physics
                        </h1>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    aria-label={sidebarOpen ? m.sidebar_close() : m.sidebar_open()}
                >
                    <span className="text-lg">
                        {sidebarOpen ? '◀' : '▶'}
                    </span>
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                    <a
                        key={item.id}
                        href={item.href}
                        className={`
                  flex items-center space-x-3 p-2.5 md:p-3 rounded-lg
                  hover:bg-muted transition-colors group
                  ${sidebarOpen ? 'justify-start' : 'justify-center'}
                `}
                        title={sidebarOpen ? '' : item.description}
                    >
                        <span className="text-lg md:text-xl">{item.icon}</span>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm md:text-sm">{item.label}</div>
                                <div className="text-xs md:text-xs text-muted-foreground truncate">
                                    {item.description}
                                </div>
                            </div>
                        )}
                    </a>
                ))}
            </nav>

            <div className="p-3 md:p-4 border-t">
                {sidebarOpen ? (
                    <div className="space-y-2">
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
