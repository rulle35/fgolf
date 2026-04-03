import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

// OCR prompt for extracting shot data from launch monitor screenshots
const OCR_SYSTEM_PROMPT = `You are an expert at reading golf launch monitor data from screenshots.
Extract ALL shot data visible in the image into structured JSON.

Return a JSON object with:
{
  "launch_monitor_type": "trackman" | "foresight" | "garmin_r10" | "rapsodo" | "flightscope" | "uneekor" | "unknown",
  "confidence": 0.0-1.0,
  "shots": [
    {
      "club_type": "driver" | "3w" | "5w" | "7w" | "4h" | "5h" | "3i" | "4i" | "5i" | "6i" | "7i" | "8i" | "9i" | "pw" | "gw" | "sw" | "lw",
      "club_name": "string or null",
      "ball_speed_mph": number or null,
      "club_speed_mph": number or null,
      "smash_factor": number or null,
      "launch_angle_deg": number or null,
      "spin_rate_rpm": number or null,
      "spin_axis_deg": number or null,
      "carry_yards": number or null,
      "total_yards": number or null,
      "offline_yards": number or null,
      "apex_height_yards": number or null,
      "attack_angle_deg": number or null,
      "club_path_deg": number or null,
      "face_angle_deg": number or null,
      "face_to_path_deg": number or null,
      "descent_angle_deg": number or null
    }
  ]
}

Rules:
- Extract every shot/row visible
- Convert units if needed (meters to yards: multiply by 1.0936)
- If a value is not visible or unreadable, use null
- Be precise with numbers — don't round
- Identify the club from context clues (column header, club name, etc.)
- If you can't determine club type, use the most likely based on the data
- Return ONLY valid JSON, no markdown or explanation`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const storagePath = formData.get('storagePath') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64 for Claude Vision
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    // OCR with Claude Vision
    const ocrResponse = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'Extract all golf shot data from this launch monitor screenshot. Return ONLY valid JSON.',
          },
        ],
      }],
      system: OCR_SYSTEM_PROMPT,
    })

    // Parse OCR result
    const ocrText = ocrResponse.content[0].type === 'text' ? ocrResponse.content[0].text : ''
    let ocrData: { launch_monitor_type: string; confidence: number; shots: Record<string, unknown>[] }

    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in OCR response')
      ocrData = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({
        error: 'Could not read the image. Please try a clearer photo.',
        detail: ocrText,
      }, { status: 422 })
    }

    if (!ocrData.shots || ocrData.shots.length === 0) {
      return NextResponse.json({
        error: 'No shot data found in the image. Make sure the launch monitor data table is visible.',
      }, { status: 422 })
    }

    // Create session in database using admin client (bypasses RLS for insert reliability)
    const adminSupabase = createAdminClient()

    const { data: session, error: sessionError } = await adminSupabase
      .from('sessions')
      .insert({
        user_id: user.id,
        session_date: new Date().toISOString().split('T')[0],
        session_type: 'practice',
        launch_monitor_type: ocrData.launch_monitor_type || null,
        total_shots: ocrData.shots.length,
        raw_file_path: storagePath,
        ocr_confidence: ocrData.confidence || null,
        data_confirmed: false,
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // Insert shots
    const shotsToInsert = ocrData.shots.map((shot: Record<string, unknown>, index: number) => ({
      session_id: session.id,
      user_id: user.id,
      club_type: (shot.club_type as string) || 'driver',
      club_name: (shot.club_name as string) || null,
      ball_speed_mph: shot.ball_speed_mph as number ?? null,
      club_speed_mph: shot.club_speed_mph as number ?? null,
      smash_factor: shot.smash_factor as number ?? null,
      launch_angle_deg: shot.launch_angle_deg as number ?? null,
      spin_rate_rpm: shot.spin_rate_rpm as number ?? null,
      spin_axis_deg: shot.spin_axis_deg as number ?? null,
      carry_yards: shot.carry_yards as number ?? null,
      total_yards: shot.total_yards as number ?? null,
      offline_yards: shot.offline_yards as number ?? null,
      apex_height_yards: shot.apex_height_yards as number ?? null,
      attack_angle_deg: shot.attack_angle_deg as number ?? null,
      club_path_deg: shot.club_path_deg as number ?? null,
      face_angle_deg: shot.face_angle_deg as number ?? null,
      face_to_path_deg: shot.face_to_path_deg as number ?? null,
      descent_angle_deg: shot.descent_angle_deg as number ?? null,
      shot_number: index + 1,
    }))

    const { error: shotsError } = await adminSupabase
      .from('shots')
      .insert(shotsToInsert)

    if (shotsError) throw shotsError

    // Update profile session count
    try {
      await adminSupabase.rpc('increment_sessions_count', { user_id_input: user.id })
    } catch {
      // Fallback: direct update if RPC doesn't exist
      await adminSupabase
        .from('profiles')
        .update({
          last_session_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    // Trigger async analysis (fire and forget — we'll build this endpoint next)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, userId: user.id }),
    }).catch(() => {}) // Don't block upload on analysis

    return NextResponse.json({
      sessionId: session.id,
      shotsCount: ocrData.shots.length,
      launchMonitor: ocrData.launch_monitor_type,
      confidence: ocrData.confidence,
    })

  } catch (err: unknown) {
    console.error('Upload error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
