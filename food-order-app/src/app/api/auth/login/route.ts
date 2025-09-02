import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const db = await connectDB()

    let user = await db.collection('stores').findOne({ email })
    let role = 'store'

    // ถ้าไม่เจอใน stores ให้ไปเช็คใน admin
    if (!user) {
      const admin = await db.collection('admin').findOne({ email })
      if (!admin) {
        return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 401 })
      }
      user = admin
      role = 'admin'
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    // สร้าง token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      message: 'Login สำเร็จ',
      role: role,
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดจากระบบ' }, { status: 500 })
  }
}
