// /api/admin/stores/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

// ตรวจสอบ admin จาก token
async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { role: string };
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = await connectDB();
    const storeId = params.id;

    const store = await db.collection("stores").findOne({ _id: new ObjectId(storeId) });
    if (!store) return NextResponse.json({ error: "ร้านค้าไม่พบ" }, { status: 404 });

    // ตรวจสอบว่าข้อมูล storeId ใน menus/orders เป็น string หรือ ObjectId
    const menus = await db
      .collection("menus")
      .find({ storeId: { $in: [storeId, new ObjectId(storeId)] } })
      .toArray();

    const orders = await db
      .collection("orders")
      .find({ storeId: { $in: [storeId, new ObjectId(storeId)] } })
      .toArray();

    return NextResponse.json({ store: { ...store, menus, orders } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = await connectDB();
    const storeId = params.id;

    // ลบเมนูทั้งหมดของร้าน
    await db.collection("menus").deleteMany({ storeId: { $in: [storeId, new ObjectId(storeId)] } });
    // ลบออเดอร์ทั้งหมดของร้าน
    await db.collection("orders").deleteMany({ storeId: { $in: [storeId, new ObjectId(storeId)] } });
    // ลบร้าน
    const result = await db.collection("stores").deleteOne({ _id: new ObjectId(storeId) });

    if (result.deletedCount === 0)
      return NextResponse.json({ error: "ร้านค้าไม่พบ" }, { status: 404 });

    return NextResponse.json({ message: "ลบร้านค้าเรียบร้อย" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = await connectDB();
    const storeId = params.id;
    const { isSuspended } = await req.json();

    if (typeof isSuspended !== "boolean")
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

    const result = await db
      .collection("stores")
      .updateOne({ _id: new ObjectId(storeId) }, { $set: { isSuspended } });

    if (result.matchedCount === 0)
      return NextResponse.json({ error: "ร้านค้าไม่พบ" }, { status: 404 });

    return NextResponse.json({ message: isSuspended ? "ระงับร้านแล้ว" : "ปลดระงับแล้ว" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}

// สำหรับ method อื่น ๆ
export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
