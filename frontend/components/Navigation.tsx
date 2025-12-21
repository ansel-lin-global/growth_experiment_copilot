'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/agent', label: 'Agent Chat', highlight: true },
    { href: '/experiment-design', label: 'Experiment Design' },
    { href: '/analysis', label: 'Results Analysis' },
  ]

  return (
    <nav className="glass border-b border-neon-purple/30 backdrop-blur-xl relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="flex items-center gap-3 text-xl font-bold transition-all duration-300 hover:opacity-90"
              >
                <Image
                  src="/logo.png"
                  alt="Growth Experiment Copilot Logo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <div className="flex items-center">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-500 font-extrabold tracking-tight">Growth Experiment</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-rose-400 font-extrabold ml-2">Copilot</span>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300 ${isActive
                      ? 'border-neon-purple text-white'
                      : item.highlight
                        ? 'border-transparent text-neon-pink hover:text-neon-cyan hover:border-neon-cyan/50'
                        : 'border-transparent text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/50'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
