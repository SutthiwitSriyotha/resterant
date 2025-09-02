// /app/api/store/[storeId]/info/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const { storeId } = params;

  try {
    const db = await connectDB();
    const store = await db
      .collection('stores')
      .findOne({ _id: new ObjectId(storeId) });

    if (!store) {
      return NextResponse.json(
        { success: false, storeDeleted: true, message: 'Store not found', menus: [] },
        { status: 404 }
      );
    }

    // ✅ เช็กฟิลด์ isSuspended
    if (store.isSuspended) {
      return NextResponse.json({
        success: true,
        storeSuspended: true,
        message: 'ร้านถูกระงับ',
        tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
        menus: [] // ป้องกัน error
      });
    }

    const menus = await db
      .collection('menus')
      .find({ storeId: store._id.toString() })
      .toArray();

    return NextResponse.json({
      success: true,
      storeSuspended: false,
      tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
      menus
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: 'Internal error', menus: [] },
      { status: 500 }
    );
  }
}
