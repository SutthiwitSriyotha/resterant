import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await connectDB();
    await db.collection("menus").deleteOne({ _id: new ObjectId(params.id) });
    return NextResponse.json({ message: "ลบเมนูเรียบร้อย" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "ไม่สามารถลบเมนูได้" }, { status: 500 });
  }
}
