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

    const store = await db.collection('stores').findOne({ _id: new ObjectId(storeId) });

    // ร้านไม่พบ
    if (!store) {
      return NextResponse.json(
        { success: false, storeDeleted: true, message: 'ร้านไม่พบ', menus: [] },
        { status: 404 }
      );
    }

    // ร้านถูกระงับ
    if (store.isSuspended) {
      return NextResponse.json({
        success: true,
        storeSuspended: true,
        message: 'ร้านถูกระงับ',
        tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
        menus: []
      });
    }

    // ร้านปิดชั่วคราว
    if (store.status === 'temporaryClosed') {
      return NextResponse.json({
        success: true,
        storeTemporaryClosed: true,
        message: 'ร้านปิดชั่วคราว',
        tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
        menus: []
      });
    }

    // ร้านเปิดปกติ
    const menus = await db
      .collection('menus')
      .find({ storeId: store._id.toString() })
      .toArray();

    return NextResponse.json({
      success: true,
      storeSuspended: false,
      storeTemporaryClosed: false,
      tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
      menus
    });

  } catch (err) {
    console.error('Error fetching store info:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error', menus: [] },
      { status: 500 }
    );
  }
}
