import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, ownerName, phone, hasTables, tablesCount, email, password } = body

    if (!name || !ownerName || !phone || !email || !password) {
      return NextResponse.json({ message: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
    }

    const db = await connectDB()

    const existingUser = await db.collection('stores').findOne({ email })
    if (existingUser) {
      return NextResponse.json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await db.collection('stores').insertOne({
      name,
      ownerName,
      phone,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      tableInfo: {
        hasTables: !!hasTables,
        tableCount: hasTables ? Number(tablesCount) : 0
      }
    })

    return NextResponse.json({ message: 'สมัครสมาชิกสำเร็จ' }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดจากระบบ' }, { status: 500 })
  }
}
