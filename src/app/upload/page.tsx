'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setError('')
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(selected)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    setStatus('Uploading image...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('session-screenshots')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      setStatus('Reading your data with AI...')

      // Send to API for OCR + analysis
      const formData = new FormData()
      formData.append('file', file)
      formData.append('storagePath', fileName)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Upload failed')
      }

      const data = await res.json()

      setStatus('Session created!')

      // Navigate to session detail
      setTimeout(() => {
        router.push(`/session/${data.sessionId}`)
      }, 500)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setStatus('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-400">F.</span>
            <span className="text-xl font-bold text-white">Golf</span>
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition text-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Upload Session</h1>
        <p className="text-gray-400 mb-8">
          Take a photo of your launch monitor screen or upload a screenshot.
        </p>

        {!preview ? (
          /* Upload Area */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-500/50 transition group"
          >
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/10 transition">
              <svg className="w-8 h-8 text-gray-500 group-hover:text-emerald-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Tap to take a photo or choose a file</p>
            <p className="text-gray-500 text-sm">Supports JPG, PNG, HEIC</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          /* Preview + Confirm */
          <div>
            <div className="relative rounded-2xl overflow-hidden mb-6">
              <img src={preview} alt="Session screenshot" className="w-full" />
              {!uploading && (
                <button
                  onClick={() => { setFile(null); setPreview(null); setError('') }}
                  className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {status && (
              <div className="flex items-center gap-3 mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
                {uploading && (
                  <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                )}
                <p className="text-gray-300 text-sm">{status}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!uploading && !status.includes('created') && (
              <button
                onClick={handleUpload}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-lg transition text-lg"
              >
                Analyze This Session
              </button>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 space-y-3">
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">Tips for best results</p>
          <div className="space-y-2">
            {[
              'Capture the full data table on your launch monitor screen',
              'Make sure the text is readable and well-lit',
              'Include column headers if visible (Club Speed, Ball Speed, etc.)',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-gray-400 text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
