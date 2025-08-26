import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(req: NextRequest) {
  try {
    const db = await connectDB();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'ไม่มี orderId' }, { status: 400 });
    }

    const result = await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });

    if (result.deletedCount === 1) {
      return NextResponse.json({ success: true, message: 'ลบออเดอร์สำเร็จ' });
    } else {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์ที่ต้องการลบ' }, { status: 404 });
    }
  } catch (error) {
    console.error('API /order/delete error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
