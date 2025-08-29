import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  const { storeId } = params;

  try {
    const db = await connectDB();
    const menus = await db
      .collection('menus')
      .find({ storeId })
      .toArray();

    return NextResponse.json({ menus });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Failed to fetch menus' }, { status: 500 });
  }
}
