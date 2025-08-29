import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;
    const { queueNumber } = await req.json();

    if (!queueNumber) {
      return NextResponse.json({ success: false, message: 'Missing queueNumber' }, { status: 400 });
    }

    const db = await connectDB();
    const result = await db.collection('orders').updateOne(
      { storeId, queueNumber: Number(queueNumber) },
      { $set: { callBill: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'เรียกเก็บเงินแล้ว' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
