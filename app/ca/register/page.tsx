'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function CARegister() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', ca_name: '', firm_name: '',
    icai_no: '', city: '', phone: ''
  })
  const [services, setServices] = useState<string[]>([])

  const allServices = ['ITR filing','GST returns','Statutory audit','TDS/TCS','ROC compliance','Bookkeeping']

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function generateFirmCode(name: string) {
    const clean = name.replace(/\s+/g, '').toUpperCase().slice(0, 8)
    const num = Math.floor(100 + Math.random() * 900)
    return clean + num
  }

  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signUpError) throw signUpError

      const userId = data.user?.id
      if (!userId) throw new Error('No user ID returned')

      await supabase.from('profiles').insert({
        user_id: userId,
        role: 'ca',
        full_name: form.ca_name,
        email: form.email,
        phone: form.phone,
      })

      const firmCode = generateFirmCode(form.firm_name)
      await supabase.from('firms').insert({
        user_id: userId,
        firm_name: form.firm_name,
        icai_no: form.icai_no,
        ca_name: form.ca_name,
        city: form.city,
        phone: form.phone,
        firm_code: firmCode,
        services: services,
      })

      setStep(3)
      setTimeout(() => router.push('/ca/dashboard'), 1500)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-lg font-medium">Register CA firm</h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6 text-xs">
          {['Firm details','Profile','Done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
                ${step > i+1 ? 'bg-emerald-600 text-white' : step === i+1 ? 'border border-emerald-600 text-emerald-600' : 'border border-gray-300 text-gray-400'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={step === i+1 ? 'text-gray-900 font-medium' : 'text-gray-400'}>{s}</span>
              {i < 2 && <div className="w-6 h-px bg-gray-300"></div>}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Firm name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Sharma & Associates"
                  value={form.firm_name} onChange={e => setForm({...form, firm_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">ICAI membership no.</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="123456"
                  value={form.icai_no} onChange={e => setForm({...form, icai_no: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Your name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="CA full name"
                  value={form.ca_name} onChange={e => setForm({...form, ca_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">City</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Hyderabad"
                  value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="ca@firm.com"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Password</label>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Min 6 characters"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button onClick={() => setStep(2)}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700">
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Services offered</label>
              <div className="flex flex-wrap gap-2">
                {allServices.map(s => (
                  <button key={s} onClick={() => toggleService(s)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all
                      ${services.includes(s) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 text-gray-600 hover:border-emerald-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleRegister} disabled={loading}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {loading ? 'Setting up your firm…' : 'Complete setup ✓'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="font-medium text-gray-900 mb-1">Firm registered!</h2>
            <p className="text-sm text-gray-500">Taking you to your dashboard…</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-4">
          Already registered?{' '}
          <button onClick={() => router.push('/ca/login')} className="text-emerald-600 hover:underline">Sign in</button>
        </p>
      </div>
    </main>
  )
}