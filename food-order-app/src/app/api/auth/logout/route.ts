import { NextResponse } from "next/server";

export async function POST() {
  // ลบ cookie ชื่อ "token" ออก
  const res = NextResponse.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // ใช้ secure ตอน production
    sameSite: "strict",
    path: "/",
    maxAge: 0, // ทำให้หมดอายุทันที
  });
  return res;
}
