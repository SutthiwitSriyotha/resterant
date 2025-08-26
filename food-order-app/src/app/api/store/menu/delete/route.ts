import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const url = new URL(req.url);
    const menuId = url.searchParams.get('id');
    if (!menuId) {
      return NextResponse.json({ success: false, message: 'Missing menu id' }, { status: 400 });
    }

    const db = await connectDB();

    // ตรวจสอบเมนูว่ามีและเป็นของร้านนี้จริงไหม
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(menuId), storeId });
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu not found or unauthorized' }, { status: 404 });
    }

    await db.collection('menus').deleteOne({ _id: new ObjectId(menuId) });

    return NextResponse.json({ success: true, message: 'Menu deleted successfully' });
  } catch (err) {
    console.error('Delete menu error:', err);
    return NextResponse.json({ success: false, message: 'Invalid token or internal error' }, { status: 401 });
  }
}
