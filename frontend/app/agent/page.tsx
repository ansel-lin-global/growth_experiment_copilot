'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { sendAgentChat, ChatMessage, AgentChatResponse } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'

// Intent display names and colors - using fuchsia accent
const intentDisplay: Record<string, { label: string; color: string; bgColor: string }> = {
  experiment_design: {
    label: 'Experiment Design',
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/15 border-fuchsia-500/30'
  },
  ab_test_analysis: {
    label: 'A/B Test Analysis',
    color: 'text-fuchsia-300',
    bgColor: 'bg-fuchsia-400/15 border-fuchsia-400/30'
  },
  causal_analysis: {
    label: 'Causal Analysis',
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-600/15 border-fuchsia-600/30'
  },
  clarification_needed: {
    label: 'Need More Info',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/15 border-amber-400/30'
  },
  general_conversation: {
    label: 'General',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/15 border-gray-400/30'
  },
}

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  intent?: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: DisplayMessage[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = 'growth-experiment-agent-sessions'

export default function AgentPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const restoredSessions = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }))
        setSessions(restoredSessions)
        if (restoredSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(restoredSessions[0].id)
        }
      } catch (e) {
        console.error('Failed to parse saved sessions:', e)
      }
    }
  }, [])

  // Save sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions])

  // Focus input on mount (without scrolling)
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [activeSessionId])

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  // Scroll to bottom only when new messages are added
  const prevMessagesLength = useRef(0)
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessagesLength.current = messages.length
  }, [messages.length])

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setError(null)
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId)
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : null)
      }
      if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      }
      return filtered
    })
  }, [activeSessionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Create new session if none exists
    let currentSessionId = activeSessionId
    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      setSessions(prev => [newSession, ...prev])
      currentSessionId = newSession.id
      setActiveSessionId(newSession.id)
    }

    // Add user message
    const newUserMessage: DisplayMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const updatedMessages = [...s.messages, newUserMessage]
        const newTitle = s.messages.length === 0
          ? userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '')
          : s.title
        return { ...s, messages: updatedMessages, title: newTitle, updatedAt: new Date() }
      }
      return s
    }))

    setLoading(true)

    try {
      const currentSession = sessions.find(s => s.id === currentSessionId)
      const existingMessages = currentSession?.messages || []
      const chatHistory: ChatMessage[] = [
        ...existingMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: userMessage },
      ]

      const response = await sendAgentChat({
        messages: chatHistory,
      })

      const assistantMessage: DisplayMessage = {
        role: 'assistant',
        content: response.reply,
        intent: response.detected_intent,
        timestamp: new Date(),
      }

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, assistantMessage], updatedAt: new Date() }
        }
        return s
      }))
    } catch (err: any) {
      setError(err.message || 'Error sending message')
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: s.messages.slice(0, -1) }
        }
        return s
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <>
      <style jsx global>{`
        html, body {
          overflow: hidden !important;
          height: 100% !important;
        }
        .agent-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.5) !important;
        }
        .agent-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(51, 65, 85, 0.8) !important;
        }
      `}</style>
      <div className="fixed inset-0 lg:top-16 overflow-hidden bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/40 via-[#0B0F19] to-[#0B0F19] flex flex-col z-30">
        {/* Top Nav / Breadcrumbs - matching Experiment Design */}
        <div className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md flex-shrink-0 z-50">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </Link>
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="h-6 w-px bg-white/10"></div>
              <h1 className="text-sm font-semibold tracking-wide text-white uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]"></span>
                Agent Chat Copilot
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-[10px] font-mono text-fuchsia-300 uppercase tracking-widest shadow-[0_0_15px_rgba(217,70,239,0.15)]">
                Chat Module Active
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto p-6 grid lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden w-full">
          {/* Left Column: Chat History Sidebar */}
          {/* Mobile Sidebar Backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Left Column: Chat History Sidebar - Mobile Drawer / Desktop Column */}
          <div className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-[#0B0F19] lg:bg-transparent border-r border-fuchsia-500/20 lg:border-none shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out
            lg:static lg:block lg:col-span-3 lg:w-auto lg:inset-auto lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <div className="surface-card rounded-xl border border-fuchsia-500/20 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] h-full flex flex-col">
              <div className="px-6 py-4 border-b border-fuchsia-500/10 bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-5 h-5 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Chat Sessions
                </h2>
              </div>

              <div className="p-3 border-b border-fuchsia-500/10">
                <button
                  onClick={createNewSession}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 hover:text-white transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">New Chat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto agent-scrollbar p-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <svg className="w-8 h-8 mx-auto mb-2 text-fuchsia-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-xs">No chat sessions yet</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${activeSessionId === session.id
                        ? 'bg-fuchsia-500/15 border border-fuchsia-500/40'
                        : 'hover:bg-slate-800/50 border border-transparent hover:border-fuchsia-500/20'
                        }`}
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      <svg className="w-4 h-4 text-fuchsia-400/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="flex-1 text-sm text-gray-300 truncate">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all duration-200"
                      >
                        <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Chat Interface */}
          <div className="lg:col-span-9 h-full flex flex-col overflow-hidden">
            <div className="surface-card rounded-xl border border-fuchsia-500/20 overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.3)] flex-1 flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-fuchsia-500/10 bg-white/[0.02] flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-5 h-5 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Conversation
                </h2>
                {activeSession && (
                  <span className="text-xs text-slate-500">
                    {activeSession.messages.length} messages
                  </span>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto agent-scrollbar p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="w-20 h-20 mb-6 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-fuchsia-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Start a Conversation
                    </h3>
                    <p className="text-slate-400 max-w-md mb-6 text-sm">
                      I can help you design experiments, analyze A/B test results, or perform causal analysis.
                    </p>
                    <div className="grid gap-2 max-w-lg w-full">
                      {[
                        'Design an A/B test for homepage recommendations',
                        'Analyze: control 1000 users, 50 conversions; treatment 1000, 65 conversions',
                        'Run a DiD analysis for Black Friday email campaign',
                      ].map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(example)}
                          className="text-left p-3 rounded-lg border border-fuchsia-500/20 bg-[#0B0F19] hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 text-gray-300 hover:text-white text-sm transition-all duration-200"
                        >
                          <span className="text-fuchsia-400 mr-2">▸</span>
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start mb-6'}`}
                    >
                      <div
                        className={`p-4 ${message.role === 'user'
                          ? 'max-w-[80%] rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30'
                          : 'w-full bg-transparent border-0 pl-0'
                          }`}
                      >
                        {message.role === 'assistant' && message.intent && (
                          <div className="mb-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${intentDisplay[message.intent]?.bgColor || 'bg-gray-500/20 border-gray-500/50'
                                } ${intentDisplay[message.intent]?.color || 'text-gray-400'}`}
                            >
                              {intentDisplay[message.intent]?.label || message.intent}
                            </span>
                          </div>
                        )}

                        <div className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-200'}`}>
                          {message.role === 'assistant' ? (
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => (
                                    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-xl font-bold text-white mb-3 mt-4 first:mt-0">{children}</h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-lg font-bold text-white mb-3 mt-4 first:mt-0">{children}</h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-base font-semibold text-fuchsia-400 mb-2 mt-3">{children}</h3>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-none space-y-1.5 mb-3">{children}</ul>
                                  ),
                                  li: ({ children }) => (
                                    <li className="flex items-start">
                                      <span className="text-fuchsia-400 mr-2 flex-shrink-0">▸</span>
                                      <span>{children}</span>
                                    </li>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-slate-900 px-1.5 py-0.5 rounded text-fuchsia-300 text-xs">
                                      {children}
                                    </code>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="text-white font-semibold">{children}</strong>
                                  ),
                                  hr: () => <hr className="border-fuchsia-500/20 my-4" />,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>

                        <div className={`mt-2 text-xs ${message.role === 'user' ? 'text-fuchsia-400/70' : 'text-gray-500'}`}>
                          {message.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#0B0F19] border border-fuchsia-500/10 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-gray-400 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm max-w-md">
                      <span className="mr-2">⚠️</span>
                      {error}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-fuchsia-500/10 p-4 bg-white/[0.02]">
                <form onSubmit={handleSubmit} className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your experiment or analysis needs..."
                      rows={1}
                      className="block w-full px-4 py-3 pr-10 lg:pr-24 bg-[#0B0F19] border border-fuchsia-500/30 rounded-lg text-sm text-slate-200 placeholder:!text-gray-500 placeholder:!opacity-40 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all resize-none min-h-[48px] max-h-[120px]"
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement
                        target.style.height = 'auto'
                        target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                      }}
                    />
                    <div className="hidden lg:block absolute right-3 bottom-3 text-xs text-gray-600">
                      Enter to send
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="group px-4 lg:px-6 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative transition-all duration-200 flex items-center justify-center self-end h-[48px]"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%), #d946ef',
                      boxShadow: '0 0 15px rgba(217, 70, 239, 0.4), 0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 tracking-wide text-sm">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        </svg>
                      ) : (
                        <>
                          <span className="hidden lg:inline">SEND</span>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
