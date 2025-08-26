// src/app/api/store/updateTables/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const body = await req.json();
    const { hasTables, tableCount } = body;

    if (typeof hasTables !== 'boolean') {
      return NextResponse.json({ success: false, message: 'ต้องระบุ hasTables' }, { status: 400 });
    }

    const db = await connectDB();
    const storesCol = db.collection('stores');

    await storesCol.updateOne(
      { _id: new ObjectId(storeId) },
      { $set: { tableInfo: { hasTables, tableCount: hasTables ? tableCount : 0 } } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'บันทึกข้อมูลโต๊ะเรียบร้อย' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
