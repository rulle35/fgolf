import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-emerald-400">F.</span>
          <span className="text-2xl font-bold text-white">Golf</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white transition text-sm">
            Log in
          </Link>
          <Link
            href="/login?signup=true"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-block bg-emerald-500/10 text-emerald-400 text-sm font-medium px-3 py-1 rounded-full mb-6">
          The first thing in golf that proves it works
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Your data.<br />
          Your proof.<br />
          <span className="text-emerald-400">Your game.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Snap a photo of your launch monitor screen. Get an AI coach that actually knows your swing,
          tracks your progress, and tells you exactly what to work on next.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login?signup=true"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 py-3.5 rounded-lg transition text-lg"
          >
            Upload Your First Session
          </Link>
        </div>
        <p className="text-gray-600 text-sm mt-4">Free to start. No credit card required.</p>

        {/* Value Props */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 text-left">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Snap & Upload</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Take a photo of your launch monitor screen. Our AI reads it instantly — TrackMan, Foresight, Garmin, whatever you use.
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Get Your Fingerprint</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Your Golf Fingerprint shows exactly where you stand — benchmarked against players at your level. One insight. One action. One outcome.
            </p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Watch It Get Scary Accurate</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Every session makes your coach smarter. Track what worked, what didn't, and prove your improvement with data — not feelings.
            </p>
          </div>
        </div>

        {/* Trust Line */}
        <div className="mt-24 border-t border-gray-800 pt-12">
          <p className="text-gray-500 text-sm">
            Works with TrackMan, Foresight/GCQuad, Garmin R10, Rapsodo, FlightScope, Uneekor, and more.
          </p>
        </div>
      </main>
    </div>
  )
}
