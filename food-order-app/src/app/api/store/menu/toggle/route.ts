// /app/api/store/menu/toggle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id'); // menu _id
    if (!id) return NextResponse.json({ success: false, message: 'Missing menu id' }, { status: 400 });

    const body = await req.json();
    const isAvailable = body.isAvailable;

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Invalid isAvailable value' }, { status: 400 });
    }

    const db = await connectDB();
    const menuCollection = db.collection('menus');

    const result = await menuCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isAvailable } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: 'Menu not found or status unchanged' }, { status: 404 });
    }

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
