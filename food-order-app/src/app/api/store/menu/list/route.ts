import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const db = await connectDB();
    const menus = await db.collection('menus').find({ storeId }).toArray();

    // เพิ่ม default addOns เป็น array ว่างถ้าไม่มี
    const menusWithAddOns = menus.map(menu => ({
      ...menu,
      addOns: menu.addOns || [],
    }));

    return NextResponse.json({ success: true, menus: menusWithAddOns });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
}
