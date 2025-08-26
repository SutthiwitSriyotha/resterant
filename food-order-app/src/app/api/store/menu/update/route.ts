// src/app/api/store/menu/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { name, price, image, description, addOns } = body;

    if (!name || !price) {
      return NextResponse.json({ success: false, message: 'Name and price are required' }, { status: 400 });
    }

    const db = await connectDB();

    // ตรวจสอบเมนูว่ามีและเป็นของร้านนี้จริงไหม
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(menuId), storeId });
    if (!menu) {
      return NextResponse.json({ success: false, message: 'Menu not found or unauthorized' }, { status: 404 });
    }

    // สร้าง object สำหรับอัปเดตข้อมูล
    const updateData: any = {
      name,
      price,
      description: description || '',
      updatedAt: new Date(),
    };
    if (image) {
      updateData.image = image;
    }

    if (addOns) {
      updateData.addOns = addOns;
    }

    // อัปเดตข้อมูลเมนู
    await db.collection('menus').updateOne(
      { _id: new ObjectId(menuId) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, message: 'Menu updated successfully' });
  } catch (err) {
    console.error('Update menu error:', err);
    return NextResponse.json({ success: false, message: 'Invalid token or internal error' }, { status: 401 });
  }
}
