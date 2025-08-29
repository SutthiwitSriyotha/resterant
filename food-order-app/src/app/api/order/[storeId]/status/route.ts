import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const order = await db.collection('orders').findOne({
      storeId,
      queueNumber: Number(queueNumber),
    });

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: order.status,
      order,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
