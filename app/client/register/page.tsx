'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ClientRegister() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    phone: '', pan: '', firm_code: '',
    employment_type: 'Salaried', employer_name: '',
    annual_income: '', address: '', gst_no: ''
  })

  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .select('*')
        .eq('firm_code', form.firm_code.toUpperCase())
        .single()

      if (firmError || !firm) {
        throw new Error(`Invalid firm code "${form.firm_code.toUpperCase()}". Available code is SARINENT697`)
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (signUpError) throw signUpError

      const userId = data.user?.id
      if (!userId) throw new Error('Registration failed. Please try again.')

      await supabase.from('profiles').insert({
        user_id: userId,
        role: 'client',
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        pan: form.pan,
      })

      const { data: newClient } = await supabase.from('clients').insert({
        firm_id: firm.id,
        user_id: userId,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        pan: form.pan,
        address: form.address,
        gst_no: form.gst_no,
        engagement_type: 'ITR filing — AY 2025-26',
        status: 'active'
      }).select().single()

      if (newClient) {
        const defaultDocs = [
          'Form 16 (salary)',
          'Bank interest certificate',
          'Home loan statement',
          'Capital gains statement',
          '80C investment proofs',
          'Rent receipts',
          'Aadhar & PAN copy'
        ]
        const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0]

        await supabase.from('documents').insert(
          defaultDocs.map(name => ({
            client_id: newClient.id,
            name,
            status: 'pending',
            due_date: dueDate
          }))
        )
      }

      await fetch('/api/send-welcome-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          full_name: form.full_name,
          firm_name: firm.firm_name,
        })
      })

      setStep(3)
      setTimeout(() => router.push('/client/portal'), 1500)

    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-lg font-medium text-gray-900">Client registration</h1>
        </div>

        <div className="flex items-center gap-2 mb-6 text-xs">
          {['Account', 'Profile', 'Done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
                ${step > i+1 ? 'bg-blue-600 text-white' :
                  step === i+1 ? 'border border-blue-600 text-blue-600' :
                  'border border-gray-300 text-gray-400'}`}>
                {step > i+1 ? '✓' : i+1}
              </div>
              <span className={step === i+1 ? 'text-gray-900 font-medium' : 'text-gray-400'}>{s}</span>
              {i < 2 && <div className="w-8 h-px bg-gray-300"></div>}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Full name *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={e => setForm({...form, full_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">PAN number</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="ABCDE1234F"
                  value={form.pan}
                  onChange={e => setForm({...form, pan: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
                <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Password *</label>
              <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Firm code * <span className="text-gray-400 font-normal">(given by your CA)</span>
              </label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 uppercase"
                placeholder="e.g. SARINENT697"
                value={form.firm_code}
                onChange={e => setForm({...form, firm_code: e.target.value})} />
            </div>
            <button onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700">
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <p className="text-xs text-gray-500">This helps your CA pre-fill your filing accurately</p>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Employment type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={form.employment_type}
                onChange={e => setForm({...form, employment_type: e.target.value})}>
                <option>Salaried</option>
                <option>Self-employed</option>
                <option>Professional</option>
                <option>Retired</option>
                <option>NRI</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Employer name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Company name"
                  value={form.employer_name}
                  onChange={e => setForm({...form, employer_name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Annual income</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 12,00,000"
                  value={form.annual_income}
                  onChange={e => setForm({...form, annual_income: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
              <textarea rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Full address"
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                GST number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                placeholder="22AAAAA0000A1Z5"
                value={form.gst_no}
                onChange={e => setForm({...form, gst_no: e.target.value})} />
            </div>
            <button onClick={handleRegister} disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating your account…' : 'Complete registration ✓'}
            </button>
            <button onClick={() => setStep(1)}
              className="w-full text-gray-500 text-sm hover:text-gray-700">← Back</button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="font-medium text-gray-900">Account created!</h2>
            <p className="text-sm text-gray-500">Taking you to your portal…</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-4">
          Already registered?{' '}
          <button onClick={() => router.push('/client/login')}
            className="text-blue-600 hover:underline">Sign in</button>
        </p>
      </div>
    </main>
  )
}