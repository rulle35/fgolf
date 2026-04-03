import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

const ANALYSIS_SYSTEM_PROMPT = `You are F.Golf's AI coaching engine. You analyze golf launch monitor data and provide actionable coaching insights.

You follow the 1-1-1 principle:
- ONE primary insight (the most impactful thing this data reveals)
- ONE recommended action (specific, actionable drill or focus for next session)
- ONE expected outcome (measurable improvement they should see)

You are direct, specific, and golf-native in your language. No fluff. No generic advice.
You reference specific numbers from their data. You compare against benchmarks when available.
You're honest — if the data shows a problem, say it clearly but constructively.

Return a JSON object:
{
  "primary_insight": "string - the one most important thing this session reveals",
  "recommended_action": "string - specific drill or focus for next practice",
  "expected_outcome": "string - what improvement to expect if they follow through",
  "full_analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "club_breakdown": {
      "club_type": {
        "avg_carry": number,
        "avg_ball_speed": number,
        "avg_spin": number,
        "consistency_rating": "high" | "medium" | "low",
        "notes": "string"
      }
    },
    "trends_vs_benchmarks": {
      "metric_name": {
        "user_value": number,
        "benchmark_p50": number,
        "assessment": "above" | "at" | "below"
      }
    }
  }
}

Return ONLY valid JSON.`

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json()
    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Missing sessionId or userId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get shots for this session
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('shot_number', { ascending: true })

    if (shotsError) throw shotsError
    if (!shots || shots.length === 0) {
      return NextResponse.json({ error: 'No shots found for session' }, { status: 404 })
    }

    // Get user profile for handicap context
    const { data: profile } = await supabase
      .from('profiles')
      .select('handicap_self_reported, handicap_estimated')
      .eq('id', userId)
      .single()

    // Get relevant benchmarks
    const handicap = profile?.handicap_estimated || profile?.handicap_self_reported || 20
    const { data: benchmarks } = await supabase
      .from('benchmarks')
      .select('*')
      .lte('handicap_min', handicap)
      .gte('handicap_max', handicap)

    // Get previous session analyses for context
    const { data: prevAnalyses } = await supabase
      .from('session_analyses')
      .select('primary_insight, recommended_action')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)

    // Build analysis prompt
    const shotsSummary = shots.map((s, i) => {
      const parts = [`Shot ${i + 1} (${s.club_type})`]
      if (s.carry_yards) parts.push(`Carry: ${s.carry_yards}y`)
      if (s.total_yards) parts.push(`Total: ${s.total_yards}y`)
      if (s.ball_speed_mph) parts.push(`Ball Speed: ${s.ball_speed_mph}mph`)
      if (s.club_speed_mph) parts.push(`Club Speed: ${s.club_speed_mph}mph`)
      if (s.launch_angle_deg) parts.push(`Launch: ${s.launch_angle_deg}°`)
      if (s.spin_rate_rpm) parts.push(`Spin: ${s.spin_rate_rpm}rpm`)
      if (s.smash_factor) parts.push(`Smash: ${s.smash_factor}`)
      if (s.offline_yards) parts.push(`Offline: ${s.offline_yards}y`)
      if (s.attack_angle_deg) parts.push(`AoA: ${s.attack_angle_deg}°`)
      if (s.club_path_deg) parts.push(`Path: ${s.club_path_deg}°`)
      if (s.face_angle_deg) parts.push(`Face: ${s.face_angle_deg}°`)
      return parts.join(' | ')
    }).join('\n')

    const benchmarkContext = benchmarks?.length
      ? `\nBenchmarks for ~${handicap} handicap:\n${benchmarks.map(b => `${b.club_type} ${b.metric_name}: P25=${b.p25}, P50=${b.p50}, P75=${b.p75}`).join('\n')}`
      : ''

    const prevContext = prevAnalyses?.length
      ? `\nPrevious session insights:\n${prevAnalyses.map(a => `- Insight: ${a.primary_insight}\n  Action: ${a.recommended_action}`).join('\n')}`
      : ''

    const userMessage = `Analyze this practice session (${shots.length} shots, estimated handicap ~${handicap}):

${shotsSummary}
${benchmarkContext}
${prevContext}

Provide your 1-1-1 analysis.`

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : ''
    let analysis: Record<string, unknown>

    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      analysis = JSON.parse(jsonMatch[0])
    } catch {
      analysis = {
        primary_insight: analysisText.slice(0, 500),
        recommended_action: 'Review your session data and focus on consistency.',
        expected_outcome: 'Better understanding of your current performance.',
        full_analysis: {},
      }
    }

    // Save analysis
    const { error: saveError } = await supabase
      .from('session_analyses')
      .insert({
        session_id: sessionId,
        user_id: userId,
        primary_insight: analysis.primary_insight as string,
        recommended_action: analysis.recommended_action as string,
        expected_outcome: analysis.expected_outcome as string,
        full_analysis: analysis.full_analysis as Record<string, unknown> || {},
        model_used: 'claude-sonnet-4-20250514',
      })

    if (saveError) throw saveError

    // Mark onboarding complete if this is first session
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true, last_session_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('onboarding_completed', false)

    return NextResponse.json({ success: true, analysis })

  } catch (err: unknown) {
    console.error('Analysis error:', err)
    const message = err instanceof Error ? err.message : 'Analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
