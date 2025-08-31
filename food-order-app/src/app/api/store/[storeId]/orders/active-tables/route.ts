// /app/api/store/[storeId]/orders/active-tables/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;

  try {
    const db = await connectDB();
    // ดึง orders ที่ status != "paid"
    const activeOrders = await db.collection('orders').find({
      storeId,
      status: { $ne: 'paid' } // ยังไม่ชำระเงิน
    }).toArray();

    // ดึงเลขโต๊ะจาก activeOrders
    const takenTables = activeOrders
      .map(order => Number(order.tableNumber))
      .filter(n => !isNaN(n));

    return NextResponse.json({ success: true, takenTables });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
