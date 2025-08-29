import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, identifier, items, totalPrice } = body;

    if (!storeId || !identifier || !items || !totalPrice) {
      return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const db = await connectDB();

    const lastOrder = await db.collection('orders')
      .find({ storeId })
      .sort({ queueNumber: -1 })
      .limit(1)
      .toArray();

    const lastQueue = lastOrder.length > 0 ? (Number(lastOrder[0].queueNumber) || 0) : 0;
    const newQueueNumber = lastQueue + 1;

    const isNumber = /^\d+$/.test(identifier);

    const orderDoc: any = {
      items,
      totalPrice,
      storeId,
      createdAt: new Date(),
      status: 'pending',
      queueNumber: newQueueNumber,
    };

    if (isNumber) {
      orderDoc.tableNumber = identifier;
    } else {
      orderDoc.customerName = identifier;
    }

    const result = await db.collection('orders').insertOne(orderDoc);

    if (!result.acknowledged) {
      return NextResponse.json({ success: false, message: 'บันทึกคำสั่งซื้อไม่สำเร็จ' });
    }

    return NextResponse.json({
      success: true,
      queueNumber: newQueueNumber,
      orderId: result.insertedId,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
