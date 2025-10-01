'use client';

import { useState, useEffect } from 'react';
import { FiCheckCircle, FiClock, FiBox, FiTruck, FiCheck } from 'react-icons/fi';
import { useParams } from 'next/navigation';
import axios from 'axios';

type AddOn = { id: string; name: string; price: number };
type OrderItem = { name: string; quantity: number; comment?: string; addOns?: AddOn[] };
type OrderStatus = {
  _id: string;
  tableNumber?: string;
  customerName?: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt: string;
  isCallBill?: boolean;
  queueNumber?: number;
};

const STATUS_LIST = [
  { key: 'pending', label: 'รอร้านรับออเดอร์', icon: <FiClock />, colorClass: 'bg-yellow-100 text-yellow-800' },
  { key: 'accepted', label: 'ร้านรับออเดอร์แล้ว', icon: <FiCheckCircle />, colorClass: 'bg-blue-100 text-blue-800' },
  { key: 'preparing', label: 'ครัวกำลังทำอาหารในรายการของคุณ', icon: <FiBox />, colorClass: 'bg-orange-100 text-orange-800' },
  { key: 'finished', label: 'ทำเสร็จแล้วรอการจัดส่ง', icon: <FiCheck />, colorClass: 'bg-green-100 text-green-800' },
  { key: 'delivering', label: 'กำลังจัดส่ง', icon: <FiTruck />, colorClass: 'bg-purple-100 text-purple-800' },
  { key: 'delivered', label: 'จัดส่งเสร็จสิ้น', icon: <FiCheckCircle />, colorClass: 'bg-green-500 text-white' },
];

const getQueueTime = (queueNumber?: number) => {
  if (!queueNumber) return '';
  if (queueNumber === 1) return 'คิวของคุณคือคิวล่าสุด (ใช้เวลาประมาณ 5-15 นาที)';
  const min = 5 + (queueNumber - 1) * 10;
  const max = 15 + (queueNumber - 1) * 10;
  return `รอคิวก่อนหน้า ${queueNumber - 1} คิว (รอประมาณ ${min}-${max} นาที)`;
};

export default function OrderStatusPage() {
  const { storeId } = useParams();
  const [identifier, setIdentifier] = useState('');
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTables, setActiveTables] = useState<number[] | null>(null);

  // ดึงเลขโต๊ะที่มีออร์เดอร์จริง
  useEffect(() => {
    const fetchActiveTables = async () => {
      try {
        const resInfo = await axios.get(`/api/store/${storeId}/info`);
        const hasTables = resInfo.data.tableInfo.hasTables;

        if (!hasTables) {
          setActiveTables(null);
          return;
        }

        const res = await axios.get(`/api/store/${storeId}/orders/tables`);
        if (res.data.success) {
          setActiveTables(res.data.tables);
        } else {
          setActiveTables([]);
        }
      } catch (err) {
        console.error(err);
        setActiveTables([]);
      }
    };
    fetchActiveTables();
  }, [storeId]);

  const fetchOrderStatus = async () => {
    if (!identifier.trim()) {
      setError(activeTables === null ? 'กรุณากรอกชื่อผู้สั่ง' : 'กรุณาเลือกโต๊ะ');
      setOrders([]);
      setMessage('');
      return;
    }

    setError('');
    setMessage('');

    const query = activeTables === null ? `customer=${identifier.trim()}` : `table=${identifier.trim()}`;

    try {
      const res = await axios.get(`/api/order/status?storeId=${storeId}&${query}`);
      const data = res.data;

      if (data.success) {
        const filteredOrders: OrderStatus[] = data.orders.filter((o: OrderStatus) => o.status !== 'paid');

        if (filteredOrders.length === 0) {
          setOrders([]);
          setError('ยังไม่มีออเดอร์ในขณะนี้');
        } else {
          setOrders(filteredOrders.sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0)));
        }

        if (activeTables !== null) {
          const resTables = await axios.get(`/api/store/${storeId}/orders/tables`);
          if (resTables.data.success) setActiveTables(resTables.data.tables);
          else setActiveTables([]);
        }
      } else {
        setOrders([]);
        setError(data.message || 'ไม่พบออเดอร์');
      }
    } catch {
      setOrders([]);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
  };

  const callForBill = async (orderId: string) => {
    try {
      const res = await axios.post(`/api/order/call-bill`, { storeId, orderId });
      const data = res.data;
      if (data.success) {
        setMessage('คุณได้เรียกพนักงานมาเก็บค่าบริการแล้ว กรุณารอสักครู่ พนักงานกำลังมา');
        setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, isCallBill: true } : o)));
      } else {
        setMessage('เรียกเช็คบิลไม่สำเร็จ');
      }
    } catch {
      setMessage('เรียกเช็คบิลไม่สำเร็จ');
    }
  };

    // Polling ทุก 10 วินาที
  useEffect(() => {
    if (!identifier.trim()) return;

    const interval = setInterval(() => {
      fetchOrderStatus();
    }, 10000); 

    return () => clearInterval(interval); // ล้างเมื่อ component unmount
  }, [identifier, storeId]);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="w-full bg-green-400 text-black h-16 px-5 shadow-md flex items-center justify-between">
        <h1 className="text-left text-xl font-bold px-6">ตรวจสอบสถานะออเดอร์</h1>
      </div>

      {/* Main card */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-md border border-gray-300 p-2 space-y-6 animate-slide-in">
          {/* ช่องกรอก/เลือกโต๊ะ */}
          <div className="flex gap-2 items-center">
            {activeTables === null ? (
              <input
                type="text"
                placeholder="กรอกชื่อผู้สั่ง"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="border border-gray-300 px-4 py-2 rounded-md flex-grow text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            ) : (
              <select
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="border border-gray-300 px-4 py-2 rounded-md flex-grow text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value=""> เลือกโต๊ะของท่าน </option>
                {activeTables.length > 0 ? (
                  activeTables.map((num) => (
                    <option key={num} value={num.toString()}>
                      โต๊ะ {num}
                    </option>
                  ))
                ) : (
                  <option disabled>ตอนนี้ยังไม่มีออเดอร์ให้ตรวจสอบ</option>
                )}
              </select>
            )}

            <button
              onClick={fetchOrderStatus}
              disabled={
                (activeTables && activeTables.length === 0) ||
                (!identifier.trim())
              }
              className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md shadow-md transition
                ${
                  (activeTables && activeTables.length === 0) || !identifier.trim()
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
            >
              ตรวจสอบ
            </button>
          </div>

          {/* ข้อความแจ้งเตือน */}
          {error && <p className="text-red-600 font-semibold">{error}</p>}
          {message && (
            <p className="text-green-700 font-medium bg-green-50 border border-green-200 p-3 rounded-md text-sm">
              {message}
            </p>
          )}

          {/* รายการออเดอร์ */}
          {orders.length > 0 && <h2 className="text-lg font-bold text-gray-800">รายการสั่งอาหาร</h2>}

          {orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => {
                const currentStatus = STATUS_LIST.find((s) => s.key === order.status);
                return (
                  <div
                    key={order._id}
                    className={`p-4 rounded-xl border flex flex-col gap-3 shadow-sm transition
                      ${order.status === 'delivered'
                        ? 'bg-green-100 border-green-400'
                        : 'bg-gray-50 border-gray-200'
                      }`}
                  >
                    <h3 className="text-md font-semibold text-gray-800">
                      {order.customerName
                        ? `ชื่อลูกค้า: ${order.customerName}`
                        : order.tableNumber
                        ? `โต๊ะ: ${order.tableNumber}`
                        : 'ไม่ระบุโต๊ะ/ลูกค้า'}
                    </h3>

                    <p className={`inline-flex items-center gap-2 font-semibold rounded px-3 py-1 w-fit ${currentStatus?.colorClass || 'bg-gray-200 text-gray-700'}`}>
                      {currentStatus?.icon} {currentStatus?.label || order.status}
                    </p>

                    <p className="mt-1 text-gray-700 font-medium">{getQueueTime(order.queueNumber)}</p>

                    <ul className="list-disc pl-6 text-gray-900 mt-0">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="mb-1">
                          <span className="font-medium">{item.name}</span> × {item.quantity}
                          {item.comment && <span className="italic text-green-800 ml-2">({item.comment})</span>}
                          {item.addOns && item.addOns.length > 0 && (
                            <span className="ml-2 text-blue-400 italic">
                              [Add: {item.addOns.map(a => `${a.name}(+${a.price})`).join(', ')}]
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>

                    <p className="font-semibold text-green-800 mt-0 text-base">
                      รวมราคา: {order.totalPrice?.toLocaleString() ?? '0'} บาท
                    </p>

                    <div className="flex justify-end mt-0">
                      <button
                        onClick={() => callForBill(order._id)}
                        disabled={!!order.isCallBill}
                        className={`px-4 py-2 rounded-md text-white font-semibold transition ${order.isCallBill ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {order.isCallBill ? 'เรียกเช็คบิลแล้ว' : 'เรียกเช็คบิล'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
