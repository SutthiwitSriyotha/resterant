import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await connectDB();
    await db.collection("orders").deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json({ message: "ลบออเดอร์เรียบร้อย" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ไม่สามารถลบออเดอร์ได้" }, { status: 500 });
  }
}
