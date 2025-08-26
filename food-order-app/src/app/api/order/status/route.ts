import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const storeId = (decoded as any).id;

    const db = await connectDB();
    const url = new URL(req.url);
    const table = url.searchParams.get('table');
    const customer = url.searchParams.get('customer');

    if (!table && !customer) {
      return NextResponse.json({ success: false, message: 'ไม่ได้ระบุเลขโต๊ะหรือชื่อลูกค้า' });
    }

    const ordersCol = db.collection('orders');

    // กำหนด query
    const query: any = { storeId, status: { $ne: 'paid' } };
    if (table) query.tableNumber = table;
    if (customer) query.customerName = { $regex: new RegExp(`^${customer}$`, 'i') }; // ไม่สนใจ case

    const orders = await ordersCol.find(query).sort({ createdAt: -1 }).toArray();

    if (!orders.length) {
      return NextResponse.json({ success: false, message: 'ไม่พบออเดอร์' });
    }

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id.toString(),
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        items: order.items,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
        isCallBill: order.isCallBill || false,
        queueNumber: order.queueNumber ?? null,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
}
