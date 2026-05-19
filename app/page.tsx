'use client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-gray-900">
            CA<span className="text-emerald-600">Flow</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Document collection platform for CA firms
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-3">🏢</div>
            <h2 className="font-medium text-gray-900 mb-1">CA Firm</h2>
            <p className="text-xs text-gray-500 mb-4">
              Register your firm and manage client documents
            </p>
            <button
              onClick={() => router.push('/ca/register')}
              className="w-full bg-emerald-600 text-white text-sm py-2 rounded-lg hover:bg-emerald-700"
            >
              Register / Sign in
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-3xl mb-3">👤</div>
            <h2 className="font-medium text-gray-900 mb-1">Client</h2>
            <p className="text-xs text-gray-500 mb-4">
              Join with your firm code and upload documents
            </p>
            <button
              onClick={() => router.push('/client/register')}
              className="w-full border border-blue-600 text-blue-600 text-sm py-2 rounded-lg hover:bg-blue-50"
            >
              Register / Sign in
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}