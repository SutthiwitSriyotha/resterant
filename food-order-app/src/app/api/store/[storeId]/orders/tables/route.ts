// /app/api/store/[storeId]/orders/tables/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;

  try {
    const db = await connectDB();

    // ดึง orders ของร้านที่ status != "paid"
    const activeOrders = await db.collection('orders').find({
      storeId,
      status: { $ne: 'paid' },
    }).toArray();

    // ดึงเลขโต๊ะที่มีออร์เดอร์จริง
    const activeTables = activeOrders
      .map(order => Number(order.tableNumber))
      .filter(n => !isNaN(n));

    // เอาเฉพาะโต๊ะไม่ซ้ำ
    const uniqueTables = Array.from(new Set(activeTables));

    return NextResponse.json({ success: true, tables: uniqueTables });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
