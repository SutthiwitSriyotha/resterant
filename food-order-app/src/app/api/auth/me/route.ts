import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET!
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string }

    return NextResponse.json({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    })
  } catch (err) {
    console.error('Auth me error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
