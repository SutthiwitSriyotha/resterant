import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const db = await connectDB();
    const store = await db.collection('stores').findOne(
      { _id: new ObjectId(storeId) },
      {
        projection: {
          name: 1,
          ownerName: 1,
          phone: 1,
          email: 1,
          createdAt: 1,
          tableInfo: 1,
          profileImage: 1,
          status: 1, // 👈 เพิ่มส่งสถานะร้าน
        },
      }
    );

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    return NextResponse.json({ store });
  } catch (error) {
    console.error('Unauthorized access:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const body = await req.json();
    const { name, ownerName, phone, hasTables, tableCount, profileImage } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'กรุณาระบุชื่อร้าน' }, { status: 400 });
    }

    const db = await connectDB();
    const result = await db.collection('stores').updateOne(
      { _id: new ObjectId(storeId) },
      {
        $set: {
          name: name.trim(),
          ownerName: ownerName?.trim() || '',
          phone: phone?.trim() || '',
          tableInfo: {
            hasTables: !!hasTables,
            tableCount: Number(tableCount) || 0,
          },
          profileImage: profileImage || '', // อัปเดตรูปโปรไฟล์
        },
      }
    );

    if (result.modifiedCount === 1) return NextResponse.json({ success: true });
    else return NextResponse.json({ success: false, message: 'แก้ไขข้อมูลไม่สำเร็จ' });
  } catch (error) {
    console.error('Unauthorized access:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
