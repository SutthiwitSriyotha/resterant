// /api/order/list/route.ts
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
    const ordersCol = db.collection('orders');

    // กรอง order เฉพาะร้านนี้
    const orders = await ordersCol
      .find({ storeId })
      .sort({ createdAt: -1 })
      .toArray();

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
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
