// /api/order/call-bill/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    const db = await connectDB();
    const orders = db.collection('orders');

    const result = await orders.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { isCallBill: true } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'ออเดอร์ไม่พบหรืออัปเดตไม่สำเร็จ' });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดขณะเรียกเช็คบิล' });
  }
}
