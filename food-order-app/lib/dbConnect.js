// lib/dbConnect.js
import mongoose from 'mongoose';

// อ่านค่าตัวแปรสภาพแวดล้อม (Environment Variable) จากไฟล์ .env.local
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

// ตัวแปรแคชเก็บ connection เพื่อใช้ซ้ำ
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    // ถ้าเคยเชื่อมต่อแล้วให้รีเทิร์น connection ที่แคชไว้เลย
    return cached.conn;
  }

  if (!cached.promise) {
    // สร้าง connection ใหม่ ถ้ายังไม่มี promise ในแคช
    const opts = {
      bufferCommands: false,
      // ตัวเลือกอื่นๆ สามารถใส่ได้ตามต้องการ
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then(mongoose => {
      return mongoose;
    });
  }
  // รอให้ connection เสร็จ
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
