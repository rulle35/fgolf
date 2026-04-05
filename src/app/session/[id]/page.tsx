'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Session, Shot, SessionAnalysis } from '@/lib/types'

export default function SessionDetailPage() {
  const { id } = useParams()
  const [session, setSession] = useState<Session | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [sessionRes, shotsRes, analysisRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).single(),
        supabase.from('shots').select('*').eq('session_id', id).order('shot_number', { ascending: true }),
        supabase.from('session_analyses').select('*').eq('session_id', id).single(),
      ])
      if (sessionRes.data) setSession(sessionRes.data)
      if (shotsRes.data) setShots(shotsRes.data)
      if (analysisRes.data) setAnalysis(analysisRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  // Poll for analysis if not yet available
  useEffect(() => {
    if (analysis || loading) return

    let attempts = 0
    const maxAttempts = 40 // ~2 minutes max polling
    const interval = setInterval(async () => {
      attempts++
      const { data } = await supabase
        .from('session_analyses')
        .select('*')
        .eq('session_id', id)
        .single()

      if (data) {
        setAnalysis(data)
        clearInterval(interval)
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
      }
    }, 3000) // Check every 3 seconds

    return () => clearInterval(interval)
  }, [analysis, loading, id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Session not found</p>
          <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  // Group shots by club
  const clubGroups = shots.reduce((acc, shot) => {
    if (!acc[shot.club_type]) acc[shot.club_type] = []
    acc[shot.club_type].push(shot)
    return acc
  }, {} as Record<string, Shot[]>)

  function avg(arr: (number | null)[]): string {
    const valid = arr.filter((v): v is number => v !== null)
    if (valid.length === 0) return '-'
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Session Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
          <p className="text-gray-400 mt-1">
            {session.total_shots} shots{session.launch_monitor_type ? ` · ${session.launch_monitor_type}` : ''}{session.facility_name ? ` · ${session.facility_name}` : ''}
          </p>
        </div>

        {/* 1-1-1 Analysis Card */}
        {analysis ? (
          <div className="bg-gradient-to-br from-emerald-900/30 to-gray-900 rounded-2xl p-6 border border-emerald-500/20 mb-8">
            <h2 className="text-sm font-medium text-emerald-400 mb-4 uppercase tracking-wider">Your Analysis</h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Insight</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.primary_insight}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Action</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.recommended_action}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Expected Outcome</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.expected_outcome}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-500/10">
              <Link href={`/chat?session=${session.id}`} className="text-emerald-400 text-sm hover:underline">
                Ask me more about this session →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-white font-medium">Analyzing your session...</p>
                <p className="text-gray-500 text-sm mt-1">Our AI coach is reviewing your {shots.length} shots. This usually takes 15-30 seconds.</p>
              </div>
            </div>
          </div>
        )}

        {/* Shot Data by Club */}
        <h2 className="text-lg font-semibold text-white mb-4">Shot Data</h2>
        <div className="space-y-4">
          {Object.entries(clubGroups).map(([club, clubShots]) => (
            <div key={club} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-white capitalize">{club.replace(/(\d)/, ' $1')}</h3>
                <span className="text-gray-500 text-sm">{clubShots.length} shots</span>
              </div>

              {/* Averages */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-800">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Carry</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.carry_yards))} <span className="text-sm text-gray-500">yds</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Ball Speed</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.ball_speed_mph))} <span className="text-sm text-gray-500">mph</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Spin</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.spin_rate_rpm))} <span className="text-sm text-gray-500">rpm</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Launch</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.launch_angle_deg))}°</p>
                </div>
              </div>

              {/* Individual Shots */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-6 py-2">#</th>
                      <th className="text-right px-3 py-2">Carry</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-right px-3 py-2">Ball Spd</th>
                      <th className="text-right px-3 py-2">Club Spd</th>
                      <th className="text-right px-3 py-2">Spin</th>
                      <th className="text-right px-3 py-2">Launch</th>
                      <th className="text-right px-6 py-2">Offline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubShots.map((shot, i) => (
                      <tr key={shot.id} className="border-t border-gray-800/50 text-gray-300">
                        <td className="px-6 py-2 text-gray-500">{i + 1}</td>
                        <td className="text-right px-3 py-2">{shot.carry_yards ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.total_yards ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.ball_speed_mph ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.club_speed_mph ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.spin_rate_rpm ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.launch_angle_deg ? `${shot.launch_angle_deg}°` : '-'}</td>
                        <td className="text-right px-6 py-2">{shot.offline_yards ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { Session, Shot, SessionAnalysis } from '@/lib/types'

export default function SessionDetailPage() {
  const { id } = useParams()
  const [session, setSession] = useState<Session | null>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [sessionRes, shotsRes, analysisRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', id).single(),
        supabase.from('shots').select('*').eq('session_id', id).order('shot_number', { ascending: true }),
        supabase.from('session_analyses').select('*').eq('session_id', id).single(),
      ])
      if (sessionRes.data) setSession(sessionRes.data)
      if (shotsRes.data) setShots(shotsRes.data)
      if (analysisRes.data) setAnalysis(analysisRes.data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading session...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Session not found</p>
          <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  // Group shots by club
  const clubGroups = shots.reduce((acc, shot) => {
    if (!acc[shot.club_type]) acc[shot.club_type] = []
    acc[shot.club_type].push(shot)
    return acc
  }, {} as Record<string, Shot[]>)

  function avg(arr: (number | null)[]): string {
    const valid = arr.filter((v): v is number => v !== null)
    if (valid.length === 0) return '-'
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Session Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h1>
          <p className="text-gray-400 mt-1">
            {session.total_shots} shots{session.launch_monitor_type ? ` · ${session.launch_monitor_type}` : ''}{session.facility_name ? ` · ${session.facility_name}` : ''}
          </p>
        </div>

        {/* 1-1-1 Analysis Card */}
        {analysis ? (
          <div className="bg-gradient-to-br from-emerald-900/30 to-gray-900 rounded-2xl p-6 border border-emerald-500/20 mb-8">
            <h2 className="text-sm font-medium text-emerald-400 mb-4 uppercase tracking-wider">Your Analysis</h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Insight</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.primary_insight}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Action</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.recommended_action}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Expected Outcome</span>
                </div>
                <p className="text-white text-lg leading-relaxed">{analysis.expected_outcome}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-500/10">
              <Link href={`/chat?session=${session.id}`} className="text-emerald-400 text-sm hover:underline">
                Ask me more about this session →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400">Analyzing your session...</p>
            </div>
          </div>
        )}

        {/* Shot Data by Club */}
        <h2 className="text-lg font-semibold text-white mb-4">Shot Data</h2>
        <div className="space-y-4">
          {Object.entries(clubGroups).map(([club, clubShots]) => (
            <div key={club} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-semibold text-white capitalize">{club.replace(/(\d)/, ' $1')}</h3>
                <span className="text-gray-500 text-sm">{clubShots.length} shots</span>
              </div>

              {/* Averages */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-800">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Carry</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.carry_yards))} <span className="text-sm text-gray-500">yds</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Ball Speed</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.ball_speed_mph))} <span className="text-sm text-gray-500">mph</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Spin</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.spin_rate_rpm))} <span className="text-sm text-gray-500">rpm</span></p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Launch</p>
                  <p className="text-white text-xl font-semibold">{avg(clubShots.map(s => s.launch_angle_deg))}°</p>
                </div>
              </div>

              {/* Individual Shots */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-6 py-2">#</th>
                      <th className="text-right px-3 py-2">Carry</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="text-right px-3 py-2">Ball Spd</th>
                      <th className="text-right px-3 py-2">Club Spd</th>
                      <th className="text-right px-3 py-2">Spin</th>
                      <th className="text-right px-3 py-2">Launch</th>
                      <th className="text-right px-6 py-2">Offline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubShots.map((shot, i) => (
                      <tr key={shot.id} className="border-t border-gray-800/50 text-gray-300">
                        <td className="px-6 py-2 text-gray-500">{i + 1}</td>
                        <td className="text-right px-3 py-2">{shot.carry_yards ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.total_yards ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.ball_speed_mph ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.club_speed_mph ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.spin_rate_rpm ?? '-'}</td>
                        <td className="text-right px-3 py-2">{shot.launch_angle_deg ? `${shot.launch_angle_deg}°` : '-'}</td>
                        <td className="text-right px-6 py-2">{shot.offline_yards ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
