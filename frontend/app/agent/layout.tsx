'use client'

import { useEffect } from 'react'

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Hide body overflow and reset scroll when on Agent page to prevent double scrollbar
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        window.scrollTo(0, 0)
        return () => {
            document.body.style.overflow = ''
        }
    }, [])

    return <>{children}</>
}
