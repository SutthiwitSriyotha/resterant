'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด')
      }

      // แยก redirect ตาม role
      if (data.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('เกิดข้อผิดพลาดบางอย่าง')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 bg-white p-8 rounded-xl shadow-lg border border-gray-200"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800">เข้าสู่ระบบ</h1>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <input
          type="email"
          placeholder="อีเมล"
          className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <p className="text-center text-sm mt-2 text-gray-600">
          ยังไม่มีบัญชี?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            สมัครสมาชิก
          </a>
        </p>
      </form>
    </div>
  )
}
