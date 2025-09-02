import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest) {
  try {
    const db = await connectDB();
    const data = await req.json();
    const { orderId, status } = data;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
    }

    const validStatuses = [
      'pending',
      'accepted',
      'preparing',
      'finished',
      'delivering',
      'delivered',
      'paid'
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    // ดึงออเดอร์มาก่อน
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์' }, { status: 404 });
    }

    // ตรวจสอบร้าน
    const store = await db.collection('stores').findOne({ _id: new ObjectId(order.storeId) });
    if (!store) {
      return NextResponse.json({ success: false, message: 'ไม่พบร้าน' }, { status: 404 });
    }

    if (store.isSuspended) {
      return NextResponse.json({ success: false, message: 'ร้านถูกระงับ ไม่สามารถอัปเดตสถานะได้' }, { status: 403 });
    }

    // อัปเดตสถานะออเดอร์
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: 'ไม่มีการเปลี่ยนแปลง' }, { status: 400 });
    }

    // รีคิวอัตโนมัติถ้าออเดอร์เสร็จสิ้น
    if (status === 'finished' || status === 'delivered') {
      const storeId = order.storeId;

      // ลบ queueNumber ของออเดอร์ที่เสร็จแล้ว
      await db.collection('orders').updateOne(
        { _id: new ObjectId(orderId) },
        { $unset: { queueNumber: '' } }
      );

      // ดึงออเดอร์ที่ยังรอทำ
      const remainingOrders = await db.collection('orders')
        .find({
          storeId,
          status: { $in: ['pending', 'accepted', 'preparing'] }
        })
        .sort({ createdAt: 1 })
        .toArray();

      // รีเซ็ต queueNumber ใหม่
      for (let i = 0; i < remainingOrders.length; i++) {
        await db.collection('orders').updateOne(
          { _id: remainingOrders[i]._id },
          { $set: { queueNumber: i + 1 } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API /order/updateStatus error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
