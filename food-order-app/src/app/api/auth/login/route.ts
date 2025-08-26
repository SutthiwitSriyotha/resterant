import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const db = await connectDB()

    const store = await db.collection('stores').findOne({ email })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 401 })
    }

    const isMatch = await bcrypt.compare(password, store.password)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = jwt.sign(
      {
        id: store._id,
        email: store.email,
        role: 'store',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({ message: 'Login successful' })
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production', // ใน local ต้อง false
      sameSite: 'lax', // ป้องกัน CSRF และช่วยให้ cookie ส่งถูกต้อง
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
