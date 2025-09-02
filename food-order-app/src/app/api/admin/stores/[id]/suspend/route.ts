import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await connectDB();
    const { isSuspended } = await req.json();
    const storeId = params.id;

    const result = await db.collection("stores").updateOne(
      { _id: new ObjectId(storeId) },
      { $set: { isSuspended } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "ร้านค้าไม่พบ" }, { status: 404 });
    }

    return NextResponse.json({ message: "เปลี่ยนสถานะเรียบร้อย", isSuspended });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
