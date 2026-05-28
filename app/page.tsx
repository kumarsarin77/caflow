'use client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <span className="text-xl font-semibold tracking-tight">
          CA<span className="text-emerald-500">Flow</span>
        </span>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/ca/login')}
            className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50">
            CA Login
          </button>
          <button
            onClick={() => router.push('/ca/register')}
            className="text-sm bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-block bg-emerald-50 text-emerald-700 text-xs font-medium px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          Built for Indian CA Firms
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-700 bg-clip-text text-transparent">
          Stop chasing clients.<br />Start closing files.
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          CAFlow automates document collection for CA firms — smart checklists, AI follow-ups, and a client portal your customers will actually use.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/ca/register')}
            className="bg-emerald-500 text-white text-base font-medium px-8 py-3.5 rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all">
            Start Free as a CA →
          </button>
          <button
            onClick={() => router.push('/client/login')}
            className="bg-white text-gray-700 text-base font-medium px-8 py-3.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
            I'm a Client
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-3 gap-6">
          {[
            { num: '100%', label: 'Automated reminders' },
            { num: 'AI', label: 'Document extraction' },
            { num: '0', label: 'Manual follow-ups needed' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
              <div className="text-3xl font-bold text-emerald-500 mb-1">{s.num}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Everything your firm needs</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto">One platform for CAs and clients — no more WhatsApp chaos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'Smart Checklists', desc: 'Auto-populated document lists by engagement type — ITR, GST, audit and more.' },
              { icon: '🤖', title: 'AI Follow-ups', desc: 'WhatsApp and email reminders that escalate automatically as deadlines approach.' },
              { icon: '⚡', title: 'Daily Auto-Reminders', desc: 'Cron-based reminders fire at 9 AM every day. Zero manual effort required.' },
              { icon: '🔍', title: 'AI Data Extraction', desc: 'Upload a PAN card or Form 16 — CAFlow reads and fills in key data instantly.' },
              { icon: '💬', title: 'AI Chatbot', desc: 'Context-aware assistant for both CA and client, always up to date on document status.' },
              { icon: '🔔', title: 'Instant Notifications', desc: 'Get alerted the moment a client uploads a document. Never miss a submission.' },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-md transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-8 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
          <p className="text-gray-500 text-base max-w-md mx-auto">Up and running in under 5 minutes.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Register your firm', desc: 'Create an account and get your unique firm code instantly.' },
            { step: '02', title: 'Add clients', desc: 'Add clients or share your firm code for self-registration.' },
            { step: '03', title: 'Assign checklists', desc: 'Pick engagement type — documents are auto-assigned.' },
            { step: '04', title: 'AI does the rest', desc: 'Reminders go out daily. You just verify and close.' },
          ].map((s, i) => (
            <div key={s.step} className="relative">
              <div className="bg-emerald-50 rounded-2xl p-6 h-full border border-emerald-100">
                <div className="text-4xl font-bold text-emerald-200 mb-3">{s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden md:block absolute top-1/2 -right-3 text-gray-300 text-xl z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOR BOTH */}
      <section className="bg-gray-50 py-24 px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <div className="text-4xl mb-4">🏢</div>
            <h3 className="text-xl font-bold mb-2">For CA Firms</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Manage all clients, track document status, send AI follow-ups, and close filings faster.</p>
            <ul className="space-y-2 mb-8">
              {['Client dashboard', 'AI-drafted reminders', 'Document verification', 'Reminder history'].map(i => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-emerald-500 font-bold">✓</span> {i}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => router.push('/ca/register')} className="flex-1 bg-emerald-500 text-white text-sm py-2.5 rounded-xl hover:bg-emerald-600">Register</button>
              <button onClick={() => router.push('/ca/login')} className="flex-1 border border-emerald-500 text-emerald-600 text-sm py-2.5 rounded-xl hover:bg-emerald-50">Login</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-bold mb-2">For Clients</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">See exactly what your CA needs, upload from your phone, and track your submission progress.</p>
            <ul className="space-y-2 mb-8">
              {['Clear document checklist', 'Upload from phone or laptop', 'Track progress live', 'AI chatbot support'].map(i => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-blue-500 font-bold">✓</span> {i}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => router.push('/client/register')} className="flex-1 bg-blue-500 text-white text-sm py-2.5 rounded-xl hover:bg-blue-600">Register</button>
              <button onClick={() => router.push('/client/login')} className="flex-1 border border-blue-500 text-blue-600 text-sm py-2.5 rounded-xl hover:bg-blue-50">Login</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 text-center">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-14 shadow-xl shadow-emerald-100">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to transform your practice?</h2>
          <p className="text-emerald-100 mb-8 text-base">Free to start. No credit card needed.</p>
          <button
            onClick={() => router.push('/ca/register')}
            className="bg-white text-emerald-600 font-semibold px-10 py-3.5 rounded-xl hover:bg-emerald-50 transition-all text-base">
            Get Started Free →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 px-8 flex items-center justify-between text-sm text-gray-400">
        <span>CA<span className="text-emerald-500">Flow</span></span>
        <span>© 2026 CAFlow. Built for Indian CA firms.</span>
        <div className="flex gap-6">
          <span className="cursor-pointer hover:text-gray-600">Privacy</span>
          <span className="cursor-pointer hover:text-gray-600">Terms</span>
          <span className="cursor-pointer hover:text-gray-600">Contact</span>
        </div>
      </footer>

    </main>
  )
}