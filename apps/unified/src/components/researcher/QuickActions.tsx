'use client'

import { Card } from '@/components/ui/card'
// import Link from 'next/link' // Removed: Next.js specific

interface QuickAction {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    href: string
    color: string
}

interface QuickActionsProps {
    actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action) => (
                <a key={action.id} href={action.href}>
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${action.color} text-white`}>
                                {action.icon}
                            </div>
                            <div>
                                <h3 className="font-medium">{action.title}</h3>
                                <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                        </div>
                    </Card>
                </a>
            ))}
        </div>
    )
}
