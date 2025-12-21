'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { sendAgentChat, ChatMessage, AgentChatResponse } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import Image from 'next/image'

// Intent display names and colors
const intentDisplay: Record<string, { label: string; color: string; bgColor: string }> = {
  experiment_design: {
    label: 'Experiment Design',
    color: 'text-neon-purple',
    bgColor: 'bg-neon-purple/20 border-neon-purple/50'
  },
  ab_test_analysis: {
    label: 'A/B Test Analysis',
    color: 'text-neon-cyan',
    bgColor: 'bg-neon-cyan/20 border-neon-cyan/50'
  },
  causal_analysis: {
    label: 'Causal Analysis',
    color: 'text-neon-pink',
    bgColor: 'bg-neon-pink/20 border-neon-pink/50'
  },
  clarification_needed: {
    label: 'Need More Info',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20 border-yellow-400/50'
  },
  general_conversation: {
    label: 'General',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20 border-gray-400/50'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
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



  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  // Scroll to bottom only when new messages are added (not on initial load)
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

  const updateSessionTitle = useCallback((sessionId: string, firstMessage: string) => {
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '')
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, title, updatedAt: new Date() } : s
    ))
  }, [])

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
      // Build chat history for API
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

      // Add assistant response
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
      // Remove the user message if error
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
    <div className="fixed inset-0 top-16 flex z-10 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent bg-dark-bg">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <div className="h-full w-64 glass border-r border-gray-700/50 flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-700/50">
            <button
              onClick={createNewSession}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-600 hover:border-neon-purple text-gray-300 hover:text-white transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${activeSessionId === session.id
                  ? 'bg-neon-purple/20 border border-neon-purple/50'
                  : 'hover:bg-gray-700/30 border border-transparent'
                  }`}
                onClick={() => setActiveSessionId(session.id)}
              >
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-4 z-20 p-2 glass rounded-r-lg border border-l-0 border-gray-700/50 hover:border-neon-purple transition-all duration-300"
        style={{ left: sidebarOpen ? '256px' : '0' }}
      >
        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-20">
                <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.5)] animate-pulse">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                  Growth Experiment Agent
                </h2>
                <p className="text-gray-400 max-w-md mb-6">
                  I can help you design experiments, analyze A/B test results, or perform causal analysis.
                  <br />
                  Try one of these examples:
                </p>
                <div className="grid gap-3 max-w-lg w-full">
                  {[
                    'I want to design an A/B test for our homepage recommendations',
                    'Analyze this AB test: control has 1000 users with 50 conversions, treatment has 1000 users with 65 conversions',
                    'Help me run a DiD analysis for our Black Friday email campaign',
                  ].map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(example)}
                      className="text-left p-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20 hover:border-purple-500/50 hover:from-purple-900/40 hover:to-pink-900/40 text-gray-300 hover:text-white text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/20"
                    >
                      <span className="text-neon-purple mr-2">▸</span>
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-4 ${message.role === 'user'
                    ? 'bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 border border-neon-purple/50'
                    : 'glass border border-gray-700'
                    }`}
                >
                  {/* Intent badge for assistant messages */}
                  {message.role === 'assistant' && message.intent && (
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${intentDisplay[message.intent]?.bgColor ||
                          'bg-gray-500/20 border-gray-500/50'
                          } ${intentDisplay[message.intent]?.color || 'text-gray-400'}`}
                      >
                        {intentDisplay[message.intent]?.label || message.intent}
                      </span>
                    </div>
                  )}

                  {/* Message content */}
                  <div
                    className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-200'
                      }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
                            ),
                            h1: ({ children }) => (
                              <h1 className="text-xl font-bold text-white mb-3 mt-4 first:mt-0">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-bold text-white mb-3 mt-4 first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold text-neon-cyan mb-2 mt-3">
                                {children}
                              </h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-none space-y-1.5 mb-3">{children}</ul>
                            ),
                            li: ({ children }) => (
                              <li className="flex items-start">
                                <span className="text-neon-purple mr-2 flex-shrink-0">▸</span>
                                <span>{children}</span>
                              </li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-dark-bg-secondary px-1.5 py-0.5 rounded text-neon-cyan text-xs">
                                {children}
                              </code>
                            ),
                            strong: ({ children }) => (
                              <strong className="text-white font-semibold">{children}</strong>
                            ),
                            hr: () => <hr className="border-gray-700 my-4" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-xs ${message.role === 'user' ? 'text-neon-purple/70' : 'text-gray-500'
                      }`}
                  >
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="glass border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-gray-400 text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
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
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700/50 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your experiment or analysis needs..."
                  rows={1}
                  className="w-full px-4 py-3 pr-32 bg-dark-bg-secondary/50 border border-gray-700 rounded-xl text-white placeholder:!text-gray-500 placeholder:!opacity-40 focus:outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30 transition-all duration-300 resize-none min-h-[48px] max-h-[120px]"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                  }}
                />
                <div className="absolute right-3 bottom-3 text-xs text-gray-600">
                  Enter to send
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 text-white rounded-xl font-medium hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 min-w-[100px] justify-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <span>Send</span>
                    <svg
                      className="w-5 h-5 -rotate-45 -translate-y-0.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
