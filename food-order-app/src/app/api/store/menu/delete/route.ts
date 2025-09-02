// src/app/api/store/menu/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) 
    return NextResponse.json({ success: false, message: 'Unauthorized: ไม่มี token' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const url = new URL(req.url);
    const menuId = url.searchParams.get('id');
    if (!menuId) {
      return NextResponse.json({ success: false, message: 'Missing menu id' }, { status: 400 });
    }

    const db = await connectDB();

    // ตรวจสอบร้าน
    const store = await db.collection('stores').findOne({ _id: new ObjectId(storeId) });
    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    if (store.isSuspended) {
      return NextResponse.json({ success: false, message: 'ร้านถูกระงับ ไม่สามารถลบเมนูได้' }, { status: 403 });
    }

    // ตรวจสอบเมนู
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(menuId), storeId });
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu not found or unauthorized' }, { status: 404 });
    }

    // ลบเมนู
    await db.collection('menus').deleteOne({ _id: new ObjectId(menuId) });

    return NextResponse.json({ success: true, message: 'Menu deleted successfully' });
  } catch (err) {
    console.error('Delete menu error:', err);
    return NextResponse.json({ success: false, message: 'Invalid token or internal error' }, { status: 401 });
  }
}
