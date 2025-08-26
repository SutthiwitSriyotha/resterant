import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {
  tls: true,
  tlsAllowInvalidCertificates: false, // ปรับตามความเหมาะสม ถ้าต้องการ bypass certificate errors ให้เป็น true
  // อาจเพิ่ม option อื่น ๆ เช่น connectTimeoutMS, serverSelectionTimeoutMS
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

declare global {
  // @ts-ignore
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectDB() {
  try {
    const client = await clientPromise;
    return client.db(); // ใช้ default database จาก URI
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error; // โยน error ขึ้นไปให้ caller รับรู้
  }
}
