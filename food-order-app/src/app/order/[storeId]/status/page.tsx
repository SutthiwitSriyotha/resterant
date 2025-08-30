'use client';

import { useState, useEffect } from 'react';
import {
  FiCheckCircle, FiClock, FiBox, FiTruck, FiCheck,
} from 'react-icons/fi';
import { useParams } from 'next/navigation';
import axios from 'axios';

type AddOn = { id: string; name: string; price: number; };
type OrderItem = { name: string; quantity: number; comment?: string; addOns?: AddOn[]; };
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
  const [hasTables, setHasTables] = useState(false);
  const [maxTableCount, setMaxTableCount] = useState(0);

  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const res = await axios.get(`/api/store/${storeId}/info`);
        if (res.data.success) {
          setHasTables(res.data.tableInfo.hasTables);
          setMaxTableCount(res.data.tableInfo.tableCount || 0);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStoreInfo();
  }, [storeId]);

  const fetchOrderStatus = async () => {
    if (!identifier.trim()) {
      setError(hasTables ? 'กรุณาเลือกเลขโต๊ะ' : 'กรุณากรอกชื่อผู้สั่ง');
      setOrders([]);
      setMessage('');
      return;
    }
    setError('');
    setMessage('');
    try {
      const query = hasTables ? `table=${identifier.trim()}` : `customer=${identifier.trim()}`;
      const res = await axios.get(`/api/order/status?storeId=${storeId}&${query}`);
      const data = res.data;

      if (data.success) {
        const filteredOrders: OrderStatus[] = data.orders.filter(
          (o: OrderStatus) => o.status !== 'paid'
        );

        if (filteredOrders.length === 0) {
          setOrders([]);
          setError('ยังไม่มีออเดอร์ในขณะนี้');
        } else {
          setOrders(filteredOrders.sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0)));
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
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, isCallBill: true } : o))
        );
      } else {
        setMessage('เรียกเช็คบิลไม่สำเร็จ');
      }
    } catch {
      setMessage('เรียกเช็คบิลไม่สำเร็จ');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white min-h-screen rounded-md shadow-md border border-gray-300">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">ตรวจสอบสถานะออเดอร์</h1>

      <div className="flex gap-3 items-center mb-6">
        {hasTables ? (
          <select
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-md flex-grow text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value=""> เลือกโต๊ะของท่าน </option>
            {Array.from({ length: maxTableCount }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num.toString()}>
                โต๊ะ {num}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="กรอกชื่อผู้สั่ง"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-md flex-grow text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        )}
        <button
          onClick={fetchOrderStatus}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md shadow-md transition"
        >
          ตรวจสอบ
        </button>
      </div>

      {error && <p className="text-red-600 font-semibold mb-4">{error}</p>}
      {message && (
        <p className="text-green-700 font-medium bg-green-50 border border-green-200 p-3 rounded-md text-sm mb-4">
          {message}
        </p>
      )}

      {orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => {
            const currentStatus = STATUS_LIST.find((s) => s.key === order.status);
            return (
              <div
                key={order._id}
                className="p-5 rounded-lg shadow-sm border border-gray-300 flex flex-col gap-4 bg-white"
              >
                <h2 className="text-xl font-semibold text-gray-800">
                  {order.customerName
                    ? `ชื่อลูกค้า: ${order.customerName}`
                    : order.tableNumber
                      ? `โต๊ะ: ${order.tableNumber}`
                      : 'ไม่ระบุโต๊ะ/ลูกค้า'}
                </h2>

                <p
                  className={`inline-flex items-center gap-2 font-semibold rounded px-3 py-1 w-fit
                  ${currentStatus?.colorClass || 'bg-gray-200 text-gray-700'}`}
                >
                  {currentStatus?.icon} {currentStatus?.label || order.status}
                </p>

                <p className="mt-1 text-gray-700 font-medium">
                  {getQueueTime(order.queueNumber)}
                </p>

                <ul className="list-disc pl-6 text-gray-900 mt-0">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="mb-1">
                      <span className="font-medium">{item.name}</span> × {item.quantity}
                      {item.comment && (
                        <span className="italic text-green-800 ml-2">({item.comment})</span>
                      )}
                      {item.addOns && item.addOns.length > 0 && (
                        <span className="ml-2 text-blue-400 italic">
                          [Addเพิ่มเติม: {item.addOns.map(a => `${a.name}(+${a.price})`).join(', ')}]
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                <p className="font-semibold text-gray-900 mt-0 text-lg">
                  รวมราคา: {order.totalPrice?.toLocaleString() ?? '0'} บาท
                </p>

                <div className="flex justify-end mt-0">
                  <button
                    onClick={() => callForBill(order._id)}
                    disabled={!!order.isCallBill}
                    className={`px-4 py-2 rounded-md text-white font-semibold transition
                      ${order.isCallBill ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
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
  );
}
