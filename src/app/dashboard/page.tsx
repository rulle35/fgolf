'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile, Session, Goal, FingerprintSnapshot } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null)
  const [fingerprint, setFingerprint] = useState<FingerprintSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [profileRes, sessionsRes, goalRes, fpRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions').select('*').eq('user_id', user.id).order('session_date', { ascending: false }).limit(10),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1),
        supabase.from('fingerprint_snapshots').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (sessionsRes.data) setSessions(sessionsRes.data)
      if (goalRes.data?.[0]) setActiveGoal(goalRes.data[0])
      if (fpRes.data?.[0]) setFingerprint(fpRes.data[0])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDeleteSession(sessionId: string) {
    setDeletingId(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      } else {
        alert('Failed to delete session. Please try again.')
      }
    } catch {
      alert('Failed to delete session. Please try again.')
    }
    setDeletingId(null)
    setShowDeleteModal(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  const hasData = sessions.length > 0

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Bar */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="text-gray-400 hover:text-white transition text-sm">Chat</Link>
            <Link href="/fingerprint" className="text-gray-400 hover:text-white transition text-sm">Fingerprint</Link>
            <Link href="/settings" className="text-gray-400 hover:text-white transition text-sm">Settings</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {profile?.display_name ? `Hey, ${profile.display_name.split(' ')[0]}` : 'Welcome back'}
          </h1>
          {profile?.handicap_estimated && (
            <p className="text-gray-400 mt-1">
              Estimated handicap: <span className="text-emerald-400 font-semibold">{profile.handicap_estimated}</span>
            </p>
          )}
        </div>

        {/* Upload CTA */}
        <Link
          href="/upload"
          className="block bg-emerald-600 hover:bg-emerald-500 rounded-2xl p-6 mb-8 transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Upload a Session</h2>
              <p className="text-emerald-100/70 text-sm mt-1">
                {hasData ? 'Snap your launch monitor screen to keep building your profile' : 'Snap a photo of your launch monitor to get started'}
              </p>
            </div>
            <svg className="w-8 h-8 text-white/60 group-hover:text-white transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>

        {!hasData ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No sessions yet</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
              Upload your first launch monitor screenshot and watch your Golf Fingerprint come to life.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {activeGoal && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Active Goal</h3>
                <p className="text-white font-semibold text-lg">{activeGoal.goal_text || activeGoal.goal_type.replace('_', ' ')}</p>
                {activeGoal.target_value && (
                  <p className="text-emerald-400 text-sm mt-1">Target: {activeGoal.target_value}</p>
                )}
              </div>
            )}

            {fingerprint && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">Golf Fingerprint</h3>
                  <Link href="/fingerprint" className="text-emerald-400 text-sm hover:underline">View full</Link>
                </div>
                {fingerprint.estimated_handicap && (
                  <p className="text-3xl font-bold text-white">{fingerprint.estimated_handicap}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">Estimated handicap from your data</p>
              </div>
            )}

            <div className="md:col-span-2 bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Sessions</h3>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-2 group">
                    <Link
                      href={`/session/${session.id}`}
                      className="flex-1 flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {new Date(session.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {session.total_shots} shots{session.facility_name ? ` · ${session.facility_name}` : ''}{session.launch_monitor_type ? ` · ${session.launch_monitor_type}` : ''}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => setShowDeleteModal(session.id)}
                      className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-gray-800 transition opacity-0 group-hover:opacity-100"
                      title="Delete session"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Session?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete this session and all its data. This can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSession(showDeleteModal)}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition text-sm font-medium disabled:opacity-50"
              >
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
