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

    // ดึงข้อมูล order ที่จะลบ
    const orderToDelete = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    if (!orderToDelete) {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์ที่ต้องการลบ' }, { status: 404 });
    }

    // ดึง storeId และ queueNumber อย่างปลอดภัย
    const storeId = orderToDelete.storeId as string;
    const deletedQueueNumber = (orderToDelete.queueNumber as number) ?? 0;

    // ลบ order
    const result = await db.collection('orders').deleteOne({ _id: new ObjectId(orderId) });

    if (result.deletedCount === 1) {
      // ลด queueNumber ของออร์เดอร์ที่ต่อจากออร์เดอร์นี้
      await db.collection('orders').updateMany(
        { 
          storeId: storeId,
          queueNumber: { $gt: deletedQueueNumber } 
        },
        { $inc: { queueNumber: -1 } }
      );

      return NextResponse.json({ success: true, message: 'ลบออเดอร์สำเร็จ และปรับเลขคิวเรียบร้อย' });
    } else {
      return NextResponse.json({ success: false, message: 'ไม่สามารถลบออเดอร์ได้' }, { status: 500 });
    }
  } catch (error) {
    console.error('API /order/delete error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
