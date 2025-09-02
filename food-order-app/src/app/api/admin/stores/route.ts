// /api/admin/stores/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await connectDB();
    
    const stores = await db.collection("stores").find({}).toArray();

    const storesWithDetails = await Promise.all(
      stores.map(async (store) => {
        const storeId = store._id.toString(); // แปลงเป็น string เผื่อ DB เก็บ string

        const menus = await db
          .collection("menus")
          .find({ storeId }) // ใช้ string
          .toArray();

        const orders = await db
          .collection("orders")
          .find({ storeId }) // ใช้ string
          .toArray();

        return {
          ...store,
          menus,
          orders,
        };
      })
    );

    return NextResponse.json(storesWithDetails);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "โหลดร้านค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
