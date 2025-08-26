import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const db = await connectDB();
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุ orderId' }, { status: 400 });
    }

    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { isPaid: true } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true, message: 'ชำระเงินแล้ว' });
    } else {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์ หรืออัปเดตไม่สำเร็จ' }, { status: 404 });
    }
  } catch (error) {
    console.error('API /order/confirm-payment error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
