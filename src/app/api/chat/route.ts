import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

const CHAT_SYSTEM_PROMPT = `You are F.Golf's AI golf coach. You have access to the golfer's complete data profile — their shot history, practice sessions, Golf Fingerprint, trends, goals, and benchmarks against their handicap peers.

Your personality:
- Direct and specific. Never generic. Reference their actual data and numbers.
- Golf-native voice. Talk like a knowledgeable caddie, not a textbook.
- Honest. If something isn't working, say it constructively.
- Concise. Get to the point. Golfers respect brevity.
- Encouraging but real. Celebrate genuine improvement, don't sugarcoat problems.

Rules:
- Always reference specific data points when making claims
- Compare against their handicap peer benchmarks when relevant
- Follow the 1-1-1 principle when giving actionable advice: one insight, one action, one expected outcome
- If asked about something not in the data, say so — don't guess
- Keep responses focused — 2-4 paragraphs max unless they ask for detail
- If they seem frustrated, acknowledge it, then redirect to something actionable`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, conversationId, sessionId } = await request.json()
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Gather user context
    const [profileRes, recentSessions, recentAnalyses, goalsRes] = await Promise.all([
      adminSupabase.from('profiles').select('*').eq('id', user.id).single(),
      adminSupabase.from('sessions').select('*, shots(*)').eq('user_id', user.id).order('session_date', { ascending: false }).limit(5),
      adminSupabase.from('session_analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
      adminSupabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active'),
    ])

    const profile = profileRes.data
    const handicap = profile?.handicap_estimated || profile?.handicap_self_reported || 20

    // If specific session context, get that session's data
    let sessionContext = ''
    if (sessionId) {
      const { data: sessionData } = await adminSupabase
        .from('sessions')
        .select('*, shots(*)')
        .eq('id', sessionId)
        .single()
      const { data: sessionAnalysis } = await adminSupabase
        .from('session_analyses')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (sessionData) {
        sessionContext = `\n\nCURRENT SESSION CONTEXT (${sessionData.session_date}, ${sessionData.total_shots} shots):
${sessionData.shots?.map((s: Record<string, unknown>) => `${s.club_type}: Carry ${s.carry_yards ?? '?'}y, Ball Speed ${s.ball_speed_mph ?? '?'}mph, Spin ${s.spin_rate_rpm ?? '?'}rpm`).join('\n')}
${sessionAnalysis ? `\nAnalysis: ${sessionAnalysis.primary_insight}\nAction: ${sessionAnalysis.recommended_action}` : ''}`
      }
    }

    // Build context
    const userContext = `GOLFER PROFILE:
Name: ${profile?.display_name || 'Unknown'}
Estimated Handicap: ${handicap}
Self-Reported Handicap: ${profile?.handicap_self_reported || 'not set'}
Total Sessions: ${profile?.sessions_count || 0}
Launch Monitor: ${profile?.primary_launch_monitor || 'unknown'}

ACTIVE GOALS:
${goalsRes.data?.map(g => `- ${g.goal_text || g.goal_type} (target: ${g.target_value || 'not set'})`).join('\n') || 'No active goals'}

RECENT SESSIONS:
${recentSessions.data?.map(s => `- ${s.session_date}: ${s.total_shots} shots with ${s.launch_monitor_type || 'unknown'}`).join('\n') || 'No sessions yet'}

RECENT INSIGHTS:
${recentAnalyses.data?.map(a => `- Insight: ${a.primary_insight}\n  Action: ${a.recommended_action}`).join('\n') || 'No analysis yet'}
${sessionContext}`

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const { data: conv } = await adminSupabase
        .from('conversations')
        .insert({ user_id: user.id, topic: message.slice(0, 100), session_id: sessionId || null })
        .select()
        .single()
      convId = conv?.id
    }

    // Get conversation history
    let history: { role: 'user' | 'assistant'; content: string }[] = []
    if (convId) {
      const { data: prevMessages } = await adminSupabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(20)
      if (prevMessages) {
        history = prevMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      }
    }

    // Call Claude
    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `${CHAT_SYSTEM_PROMPT}\n\n${userContext}`,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    })

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : ''

    // Save messages
    if (convId) {
      await adminSupabase.from('messages').insert([
        { conversation_id: convId, role: 'user', content: message },
        { conversation_id: convId, role: 'assistant', content: assistantMessage, model_used: 'claude-sonnet-4-20250514', tokens_used: response.usage.output_tokens },
      ])
    }

    // Increment chat query count (best effort)
    try {
      await adminSupabase.rpc('increment_chat_queries', { user_id_input: user.id })
    } catch {
      // RPC may not exist yet — non-blocking
    }

    return NextResponse.json({
      response: assistantMessage,
      conversationId: convId,
    })

  } catch (err: unknown) {
    console.error('Chat error:', err)
    const message = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
