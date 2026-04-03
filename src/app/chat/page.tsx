'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CONTEXTUAL_PROMPTS = [
  'What should I work on next session?',
  'How does my driver compare to my handicap level?',
  'What is my biggest weakness right now?',
  'Am I improving? Show me the trends.',
  'Give me a 3-session practice plan.',
  'Why is my spin so high with irons?',
]

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-pulse text-gray-500">Loading...</div></div>}>
      <ChatPageInner />
    </Suspense>
  )
}

function ChatPageInner() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionContext = searchParams.get('session')
  const supabase = createClient()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const userMessage: ChatMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId,
          sessionId: sessionContext,
        }),
      })

      if (!res.ok) throw new Error('Chat failed')

      const data = await res.json()
      setConversationId(data.conversationId)
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I hit an error. Try again in a moment.",
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">AI Coach</span>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {messages.length === 0 ? (
            /* Empty state with contextual prompts */
            <div className="py-16">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-white mb-2">What do you want to work on?</h2>
                <p className="text-gray-500">
                  {sessionContext
                    ? 'Ask me anything about this session, or pick a question below.'
                    : 'I know your data, your trends, and your goals. Ask me anything.'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {CONTEXTUAL_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-emerald-500/40 hover:bg-gray-800/50 transition text-sm text-gray-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-900 text-gray-200 border border-gray-800'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-6 py-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI coach anything..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl transition disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
