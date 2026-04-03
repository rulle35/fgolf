'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { LAUNCH_MONITORS } from '@/lib/types'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    display_name: '',
    handicap_self_reported: '',
    primary_launch_monitor: '',
    home_facility: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setForm({
          display_name: data.display_name || '',
          handicap_self_reported: data.handicap_self_reported?.toString() || '',
          primary_launch_monitor: data.primary_launch_monitor || '',
          home_facility: data.home_facility || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name || null,
        handicap_self_reported: form.handicap_self_reported ? parseFloat(form.handicap_self_reported) : null,
        primary_launch_monitor: form.primary_launch_monitor || null,
        home_facility: form.home_facility || null,
      })
      .eq('id', profile?.id)

    if (error) {
      setMessage('Failed to save. Try again.')
    } else {
      setMessage('Saved!')
    }
    setSaving(false)
  }

  async function handleManageSubscription() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    }
  }

  async function handleUpgrade() {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'monthly' }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">Dashboard</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Handicap (self-reported)</label>
            <input
              type="number"
              step="0.1"
              value={form.handicap_self_reported}
              onChange={e => setForm(f => ({ ...f, handicap_self_reported: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              placeholder="e.g. 15.2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Primary Launch Monitor</label>
            <select
              value={form.primary_launch_monitor}
              onChange={e => setForm(f => ({ ...f, primary_launch_monitor: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Select...</option>
              {LAUNCH_MONITORS.map(lm => (
                <option key={lm.value} value={lm.value}>{lm.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Home Facility</label>
            <input
              type="text"
              value={form.home_facility}
              onChange={e => setForm(f => ({ ...f, home_facility: e.target.value }))}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              placeholder="Where do you usually practice?"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {message && (
            <p className={`text-sm text-center ${message === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message}
            </p>
          )}
        </form>

        {/* Subscription */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold capitalize">{profile?.account_tier || 'free'} Plan</p>
              {profile?.account_tier === 'trial' && profile?.trial_ends_at && (
                <p className="text-gray-500 text-sm mt-1">
                  Trial ends {new Date(profile.trial_ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
            {profile?.account_tier === 'premium' ? (
              <button
                onClick={handleManageSubscription}
                className="text-emerald-400 text-sm hover:underline"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        {/* Account */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Account</h2>
          <p className="text-gray-400 text-sm mb-4">{profile?.email}</p>
          <button
            onClick={handleSignOut}
            className="text-red-400 text-sm hover:underline"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  )
}
