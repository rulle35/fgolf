import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the session belongs to this user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete related data first (analyses, shots), then the session
    // Order matters due to foreign key constraints
    await supabase.from('session_analyses').delete().eq('session_id', id)
    await supabase.from('shots').delete().eq('session_id', id)

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete session:', deleteError)
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
