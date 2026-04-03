'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FingerprintSnapshot, FingerprintData } from '@/lib/types'

// Radar chart component - pure SVG, no dependencies
function RadarChart({ data, size = 300 }: { data: FingerprintData; size?: number }) {
  const center = size / 2
  const radius = size * 0.38
  const metrics = [
    { key: 'driving_distance', label: 'Distance' },
    { key: 'driving_accuracy', label: 'Accuracy' },
    { key: 'iron_consistency', label: 'Iron Play' },
    { key: 'wedge_control', label: 'Wedges' },
    { key: 'launch_efficiency', label: 'Launch Eff.' },
    { key: 'spin_control', label: 'Spin Control' },
  ]
  const angleStep = (2 * Math.PI) / metrics.length
  const startAngle = -Math.PI / 2 // Start from top

  // Generate points for each ring (20, 40, 60, 80, 100)
  function getPoint(index: number, value: number) {
    const angle = startAngle + index * angleStep
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  function ringPoints(value: number) {
    return metrics.map((_, i) => {
      const pt = getPoint(i, value)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }

  const dataPoints = metrics.map((m, i) => {
    const val = Math.min(100, Math.max(0, data[m.key] || 0))
    return getPoint(i, val)
  })

  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto">
      {/* Grid rings */}
      {[20, 40, 60, 80, 100].map(v => (
        <polygon key={v} points={ringPoints(v)} fill="none" stroke="#1F2937" strokeWidth="1" />
      ))}

      {/* Axis lines */}
      {metrics.map((_, i) => {
        const pt = getPoint(i, 100)
        return <line key={i} x1={center} y1={center} x2={pt.x} y2={pt.y} stroke="#1F2937" strokeWidth="1" />
      })}

      {/* Data polygon */}
      <polygon points={dataPath} fill="rgba(16, 185, 129, 0.15)" stroke="#10B981" strokeWidth="2" />

      {/* Data points */}
      {dataPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#10B981" />
      ))}

      {/* Labels */}
      {metrics.map((m, i) => {
        const pt = getPoint(i, 120)
        const val = Math.round(data[m.key] || 0)
        return (
          <g key={m.key}>
            <text x={pt.x} y={pt.y - 6} textAnchor="middle" className="fill-gray-400 text-[11px]">
              {m.label}
            </text>
            <text x={pt.x} y={pt.y + 10} textAnchor="middle" className="fill-white text-[13px] font-semibold">
              {val}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function FingerprintPage() {
  const [snapshots, setSnapshots] = useState<FingerprintSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('fingerprint_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setSnapshots(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  const latest = snapshots[0]
  const previous = snapshots[1]

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

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Your Golf Fingerprint</h1>
        <p className="text-gray-400 mb-8">
          A unique profile of your game, built from your data and benchmarked against players at your level.
        </p>

        {!latest ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No fingerprint yet</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Upload at least one practice session to start building your Golf Fingerprint.
            </p>
            <Link href="/upload" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition">
              Upload a Session
            </Link>
          </div>
        ) : (
          <div>
            {/* Radar Chart */}
            <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-6">
              <RadarChart data={latest.fingerprint_data} />
              {latest.estimated_handicap && (
                <div className="text-center mt-6">
                  <p className="text-gray-500 text-sm">Estimated Handicap</p>
                  <p className="text-4xl font-bold text-white">{latest.estimated_handicap}</p>
                </div>
              )}
            </div>

            {/* Metric Breakdown */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Metric Breakdown</h2>
              <div className="space-y-4">
                {Object.entries(latest.fingerprint_data).map(([key, value]) => {
                  if (typeof value !== 'number') return null
                  const prevValue = previous?.fingerprint_data?.[key]
                  const delta = prevValue != null ? value - (prevValue as number) : null
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-300 text-sm">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{Math.round(value)}</span>
                          {delta !== null && delta !== 0 && (
                            <span className={`text-xs font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, value)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* History */}
            {snapshots.length > 1 && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Fingerprint History</h2>
                <div className="space-y-3">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400 text-sm">
                        {new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-white font-medium">
                        {snap.estimated_handicap ?? '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat CTA */}
            <div className="mt-6 text-center">
              <Link href="/chat" className="text-emerald-400 hover:underline text-sm">
                Ask your coach what to focus on →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
