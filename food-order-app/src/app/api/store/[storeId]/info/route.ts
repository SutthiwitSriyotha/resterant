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

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tableInfo: store.tableInfo || { hasTables: false, tableCount: 0 },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
