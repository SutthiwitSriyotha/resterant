import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ตรวจสอบ JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const body = await req.json();
    const { status } = body;

    // ✅ รองรับ active / suspended / temporaryClosed
    if (!status || !['active', 'suspended', 'temporaryClosed'].includes(status)) {
      return NextResponse.json({ success: false, message: 'Status invalid' }, { status: 400 });
    }

    // เชื่อม MongoDB
    const db = await connectDB();

    const result = await db.collection('stores').updateOne(
      { _id: new ObjectId(storeId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true, newStatus: status });
    } else {
      return NextResponse.json({ success: false, message: 'ไม่สามารถเปลี่ยนสถานะร้านได้' });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Unauthorized or server error' }, { status: 401 });
  }
}
