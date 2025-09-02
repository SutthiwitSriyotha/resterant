// src/app/api/store/menu/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  // ดึง token จาก cookies
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: ไม่มี token' },
      { status: 401 }
    );
  }

  try {
    // ตรวจสอบ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const db = await connectDB();

    // หา store
    const store = await db.collection('stores').findOne({ _id: new ObjectId(storeId) });
    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    // ✅ ตรวจสอบว่าร้านถูกระงับหรือไม่
    if (store.isSuspended) {
      return NextResponse.json({
        success: false,
        message: 'ร้านถูกระงับ ไม่สามารถเพิ่มเมนูได้',
      }, { status: 403 });
    }

    // ดึงข้อมูลเมนูจาก request
    const body = await req.json();
    const menus = body.menus;

    if (!Array.isArray(menus) || menus.length === 0) {
      return NextResponse.json({ success: false, message: 'No menus provided' }, { status: 400 });
    }

    // เพิ่มเมนูลง DB
    const result = await db.collection('menus').insertMany(
      menus.map((menu: any) => ({
        ...menu,
        addOns: menu.addOns || [],
        storeId,
        storeName: store.name,
        createdAt: new Date(),
      }))
    );

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      insertedIds: Object.values(result.insertedIds),
    });
  } catch (err: any) {
    console.error('Token verification or DB error:', err);
    return NextResponse.json(
      { success: false, message: 'Invalid token or internal error' },
      { status: 401 }
    );
  }
}
