// createAdmin.ts
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

async function createAdmin() {
  const uri = "mongodb+srv://sutthiwitsriyotha:hDRWxVZH4Ji5jusr@cluster0.jc2yzqx.mongodb.net/food-order-app?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("food-order-app");
    const users = db.collection("admin"); // <-- เปลี่ยนจาก 'admin' เป็น 'users'

    const email = "admin@example.com";
    const password = "Admin1234";
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = "admin";

    const existing = await users.findOne({ email });
    if (existing) {
      console.log("บัญชี admin มีอยู่แล้ว!");
      return;
    }

    const result = await users.insertOne({ email, password: hashedPassword, role });
    console.log("สร้าง admin เรียบร้อย:", result.insertedId);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

createAdmin();
