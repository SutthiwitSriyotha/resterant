// /app/api/order/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const storeId = url.searchParams.get('storeId');
    const table = url.searchParams.get('table');
    const customer = url.searchParams.get('customer');

    if (!storeId || (!table && !customer)) {
      return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบ' }, { status: 400 });
    }

    const db = await connectDB();
    const ordersCol = db.collection('orders');

    // สร้าง query
    const query: any = { storeId, status: { $ne: 'paid' } };
    if (table) query.tableNumber = table;
    if (customer) query.customerName = { $regex: new RegExp(`^${customer}$`, 'i') }; // ไม่สนใจ case

    const orders = await ordersCol.find(query).sort({ queueNumber: 1 }).toArray();

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
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
