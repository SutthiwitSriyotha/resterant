'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    hasTables: false,
    tablesCount: 0,
    email: '',
    password: '',
  })

  const [errors, setErrors] = useState({
    phone: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const validatePhone = (phone: string) => {
    const phonePattern = /^(09|08|06)\d{8}$/
    if (!phonePattern.test(phone)) {
      return 'เบอร์โทรไม่ถูกต้อง ต้องมี 10 หลักและขึ้นต้นด้วย 09 08 หรือ 06'
    }
    return ''
  }

  const validatePassword = (password: string) => {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordPattern.test(password)) {
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข'
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setForm({
      ...form,
      [name]: newValue,
    })

    // ตรวจสอบ validation แบบ real-time
    if (name === 'phone') {
      setErrors({ ...errors, phone: validatePhone(newValue as string) })
    }
    if (name === 'password') {
      setErrors({ ...errors, password: validatePassword(newValue as string) })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitError('')

  // ตรวจสอบ validation อีกครั้งก่อน submit
  const phoneError = validatePhone(form.phone)
  const passwordError = validatePassword(form.password)
  setErrors({ phone: phoneError, password: passwordError })

  if (phoneError || passwordError) return

  setLoading(true)
  try {
    // สร้าง object ส่งไป API และเพิ่ม status เป็น 'active'
    const payload = { ...form, status: 'active' }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Signup failed')
    }

    router.push('/login')
  } catch (err: unknown) {
    if (err instanceof Error) setSubmitError(err.message)
    else setSubmitError('เกิดข้อผิดพลาดบางอย่าง')
  } finally {
    setLoading(false)
  }
}


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-white p-8 rounded-xl shadow-lg border border-gray-200"
      >
        <h1 className="text-2xl font-bold text-center text-gray-800">สมัครเปิดร้าน</h1>

        <p className="text-sm text-gray-600 text-center">
          ลงทะเบียนเพื่อเปิดร้านอาหารของคุณบนระบบ ลูกค้าสามารถสแกน QR Code เพื่อสั่งอาหาร
          และคุณสามารถจัดการเมนู จัดการออเดอร์ และยืนยันการชำระเงินได้สะดวก
        </p>

        {submitError && <p className="text-red-600">{submitError}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้านของคุณ</label>
          <input
            type="text"
            name="name"
            placeholder="เช่น ร้านก๋วยเตี๋ยวเรือโบราณ"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ติดต่อ</label>
          <input
            type="text"
            name="ownerName"
            placeholder="ชื่อ-นามสกุลหรือชื่อเล่นของคุณ"
            value={form.ownerName}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
          <input
            type="tel"
            name="phone"
            placeholder="กรอกเบอร์โทรที่ใช้ติดต่อ"
            value={form.phone}
            onChange={handleChange}
            required
            className={`w-full px-4 py-2 rounded-md border ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            } text-gray-900`}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="hasTables"
            checked={form.hasTables}
            onChange={handleChange}
            className="w-4 h-4"
          />
          <label className="text-sm text-gray-700">ร้านมีโต๊ะสำหรับลูกค้านั่ง</label>
        </div>

        {form.hasTables && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนโต๊ะ</label>
            <input
              type="number"
              name="tablesCount"
              placeholder="กรอกจำนวนโต๊ะ เช่น 15"
              value={form.tablesCount}
              onChange={handleChange}
              min={1}
              className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-900"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
          <input
            type="email"
            name="email"
            placeholder="เช่น example@email.com"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-md border border-gray-300 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
          <input
            type="password"
            name="password"
            placeholder="อย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ เล็ก และตัวเลข"
            value={form.password}
            onChange={handleChange}
            required
            className={`w-full px-4 py-2 rounded-md border ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            } text-gray-900`}
          />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>

        <p className="text-center text-sm mt-2 text-gray-600">
          มีบัญชีแล้ว?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            เข้าสู่ระบบ
          </a>
        </p>
      </form>
    </div>
  )
}
