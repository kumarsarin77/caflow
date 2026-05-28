'use client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <span className="text-xl font-bold tracking-tight">
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
            className="text-sm bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 shadow-md shadow-emerald-200">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-8 pt-24 pb-28 text-center overflow-hidden"
        style={{background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 40%, #eff6ff 100%)'}}>
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)',
        }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase">
            ✦ Built for Indian CA Firms
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6"
            style={{background: 'linear-gradient(135deg, #111827 30%, #059669 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Stop chasing clients.<br />Start closing files.
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            CAFlow automates document collection for CA firms — smart checklists, AI follow-ups, and a client portal your customers will actually use.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/ca/register')}
              className="bg-emerald-500 text-white text-base font-semibold px-8 py-4 rounded-2xl hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all hover:scale-105">
              Start Free as a CA →
            </button>
            <button
              onClick={() => router.push('/client/login')}
              className="bg-white text-gray-700 text-base font-medium px-8 py-4 rounded-2xl border border-gray-200 hover:bg-gray-50 shadow-md transition-all hover:scale-105">
              I'm a Client
            </button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="max-w-4xl mx-auto px-8 -mt-8 mb-8 relative z-10">
        <div className="grid grid-cols-3 gap-4">
          {[
            { num: '100%', label: 'Automated reminders', color: 'from-emerald-400 to-emerald-600' },
            { num: 'AI', label: 'Document extraction', color: 'from-blue-400 to-blue-600' },
            { num: '0', label: 'Manual follow-ups needed', color: 'from-violet-400 to-violet-600' },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-6 text-center shadow-lg`}>
              <div className="text-4xl font-extrabold text-white mb-1">{s.num}</div>
              <div className="text-sm text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-8" style={{background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)'}}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">Features</div>
            <h2 className="text-4xl font-extrabold mb-3">Everything your firm needs</h2>
            <p className="text-gray-400 text-base max-w-md mx-auto">One platform for CAs and clients — no more WhatsApp chaos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '📋', title: 'Smart Checklists', desc: 'Auto-populated document lists by engagement type — ITR, GST, audit and more.', color: 'bg-emerald-50 border-emerald-100' },
              { icon: '🤖', title: 'AI Follow-ups', desc: 'WhatsApp and email reminders that escalate automatically as deadlines approach.', color: 'bg-blue-50 border-blue-100' },
              { icon: '⚡', title: 'Daily Auto-Reminders', desc: 'Cron-based reminders fire at 9 AM every day. Zero manual effort required.', color: 'bg-violet-50 border-violet-100' },
              { icon: '🔍', title: 'AI Data Extraction', desc: 'Upload a PAN card or Form 16 — CAFlow reads and fills in key data instantly.', color: 'bg-amber-50 border-amber-100' },
              { icon: '💬', title: 'AI Chatbot', desc: 'Context-aware assistant for both CA and client, always up to date on document status.', color: 'bg-pink-50 border-pink-100' },
              { icon: '🔔', title: 'Instant Notifications', desc: 'Get alerted the moment a client uploads a document. Never miss a submission.', color: 'bg-teal-50 border-teal-100' },
            ].map((f) => (
              <div key={f.title} className={`${f.color} rounded-2xl p-6 border hover:shadow-lg transition-all hover:-translate-y-1`}>
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-8" style={{background: 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)'}}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">How it works</div>
            <h2 className="text-4xl font-extrabold mb-3">Up and running in minutes</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto">Four simple steps to transform your practice.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Register your firm', desc: 'Create an account and get your unique firm code instantly.', color: 'bg-emerald-500' },
              { step: '02', title: 'Add clients', desc: 'Add clients or share your firm code for self-registration.', color: 'bg-blue-500' },
              { step: '03', title: 'Assign checklists', desc: 'Pick engagement type — documents are auto-assigned.', color: 'bg-violet-500' },
              { step: '04', title: 'AI does the rest', desc: 'Reminders go out daily. You just verify and close.', color: 'bg-amber-500' },
            ].map((s, i) => (
              <div key={s.step} className="relative">
                <div className="bg-white rounded-2xl p-6 h-full shadow-md border border-white hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className={`${s.color} text-white text-sm font-bold w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-md`}>{s.step}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-gray-300 text-2xl z-10 font-bold">›</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR BOTH */}
      <section className="py-24 px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">Who it's for</div>
            <h2 className="text-4xl font-extrabold mb-3">Built for both sides</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-3xl p-8 border border-emerald-100 shadow-lg shadow-emerald-50"
              style={{background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)'}}>
              <div className="text-5xl mb-4">🏢</div>
              <h3 className="text-2xl font-extrabold mb-2 text-emerald-900">For CA Firms</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">Manage all clients, track document status, send AI follow-ups, and close filings faster.</p>
              <ul className="space-y-2 mb-8">
                {['Client dashboard', 'AI-drafted reminders', 'Document verification', 'Reminder history'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button onClick={() => router.push('/ca/register')} className="flex-1 bg-emerald-500 text-white text-sm py-3 rounded-xl hover:bg-emerald-600 font-semibold shadow-md shadow-emerald-200">Register</button>
                <button onClick={() => router.push('/ca/login')} className="flex-1 border-2 border-emerald-500 text-emerald-600 text-sm py-3 rounded-xl hover:bg-emerald-50 font-semibold">Login</button>
              </div>
            </div>
            <div className="rounded-3xl p-8 border border-blue-100 shadow-lg shadow-blue-50"
              style={{background: 'linear-gradient(135deg, #eff6ff, #eef2ff)'}}>
              <div className="text-5xl mb-4">👤</div>
              <h3 className="text-2xl font-extrabold mb-2 text-blue-900">For Clients</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">See exactly what your CA needs, upload from your phone, and track your submission progress.</p>
              <ul className="space-y-2 mb-8">
                {['Clear document checklist', 'Upload from phone or laptop', 'Track progress live', 'AI chatbot support'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <button onClick={() => router.push('/client/register')} className="flex-1 bg-blue-500 text-white text-sm py-3 rounded-xl hover:bg-blue-600 font-semibold shadow-md shadow-blue-200">Register</button>
                <button onClick={() => router.push('/client/login')} className="flex-1 border-2 border-blue-500 text-blue-600 text-sm py-3 rounded-xl hover:bg-blue-50 font-semibold">Login</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8">
        <div className="max-w-3xl mx-auto rounded-3xl p-16 text-center shadow-2xl shadow-emerald-100"
          style={{background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)'}}>
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to transform your practice?</h2>
          <p className="text-white/70 mb-10 text-base">Free to start. No credit card needed.</p>
          <button
            onClick={() => router.push('/ca/register')}
            className="bg-white text-emerald-600 font-bold px-12 py-4 rounded-2xl hover:bg-emerald-50 transition-all text-base shadow-xl hover:scale-105">
            Get Started Free →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 px-8 flex items-center justify-between text-sm text-gray-400">
        <span className="font-bold text-base">CA<span className="text-emerald-500">Flow</span></span>
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