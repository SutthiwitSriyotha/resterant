'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FiCheckCircle,FiClock,FiBox,FiTruck,FiDollarSign,FiCheck,FiTrash2,
} from 'react-icons/fi';

type AddOn = {
  id: string;
  name: string;
  price: number;
};

type OrderItem = {
  name: string;
  quantity: number;
  comment?: string;
  addOns?: AddOn[];
};


type Order = {
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
  { key: 'pending', label: 'รอรับออเดอร์', icon: <FiClock />, colorClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  { key: 'accepted', label: 'รับออเดอร์แล้ว', icon: <FiCheckCircle />, colorClass: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  { key: 'preparing', label: 'เริ่มทำอาหาร', icon: <FiBox />, colorClass: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
  { key: 'finished', label: 'ทำเสร็จสิ้น', icon: <FiCheck />, colorClass: 'bg-green-100 text-green-800 hover:bg-green-200' },
  { key: 'delivering', label: 'กำลังจัดส่ง', icon: <FiTruck />, colorClass: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
  { key: 'delivered', label: 'เสร็จสิ้นการส่ง', icon: <FiCheckCircle />, colorClass: 'bg-green-300 text-gray-700 hover:bg-green-400' },
  { key: 'paid', label: 'ยืนยันชำระเงิน', icon: <FiDollarSign />, colorClass: 'bg-green-600 text-white hover:bg-green-700' },
];

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showPaidOrders, setShowPaidOrders] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // โหลดออเดอร์
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/order/list', { withCredentials: true });
      setOrders(res.data.orders || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        // ถ้าไม่ได้ login → redirect ไปหน้า login
        window.location.href = '/login';
        return;
      }
      alert('เกิดข้อผิดพลาดในการโหลดออเดอร์');
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  
  // อัปเดตสถานะออเดอร์
  const updateStatus = async (orderId: string, newStatus: string) => {
  if (updatingOrderId) return;
  setUpdatingOrderId(orderId);
  try {
    const res = await axios.put('/api/order/updateStatus', { orderId, status: newStatus });
    if (res.data.success) {
      fetchOrders(); // ✅ รีเฟรชข้อมูลรวม queueNumber ใหม่
    } else {
      alert('อัปเดตสถานะล้มเหลว');
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    console.error(error);
  }
  setUpdatingOrderId(null);
};


  // ฟิลเตอร์ช่วงเวลา
  const filterByTimeRange = (orders: Order[]) => {
    const now = new Date();
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (timeRange === 'day') {
        return orderDate.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      } else if (timeRange === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  };

  // กรองและจัดเรียงออเดอร์ 
const filteredOrders = showPaidOrders
  ? filterByTimeRange(orders.filter((o) => o.status === 'paid'))
  : orders.filter((o) => o.status !== 'paid');

// 🟢 เปลี่ยนให้เก่าอยู่บน (earliest first)
const sortedOrders = [...filteredOrders].sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);


  // สรุปยอดรวมและจำนวนออเดอร์
  const totalRevenue = sortedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalCount = sortedOrders.length;

  // ลบออเดอร์
  const deleteOrder = async (orderId: string) => {
    if (!confirm('คุณแน่ใจว่าจะลบออเดอร์นี้หรือไม่?')) return;
    try {
      const res = await fetch(`/api/order/delete?orderId=${orderId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('ลบออเดอร์สำเร็จ');
        fetchOrders();
      } else {
        alert(`ลบออเดอร์ไม่สำเร็จ: ${data.message}`);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบออเดอร์');
      console.error(error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white min-h-screen rounded-md shadow-md">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900 border-b border-gray-300 pb-4">
        จัดการออเดอร์ร้านอาหาร
      </h1>

      {/* ✅ กล่องแสดงจำนวนคิว */}
      {!showPaidOrders && (
        <div className="flex justify-end">
          <div className="bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg shadow">
            {/* นับเฉพาะสถานะ active */}
            คิวที่เหลือ: {orders.filter(o => ['pending','accepted','preparing','finished','delivering'].includes(o.status)).length}
          </div>
        </div>
      )}



      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <button
          onClick={() => setShowPaidOrders((prev) => !prev)}
          className="px-5 py-2 rounded-md font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          {showPaidOrders ? 'ดูออเดอร์ที่ยังไม่เสร็จ' : 'ดูออเดอร์ที่เสร็จสิ้น'}
        </button>

        {showPaidOrders && (
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="border border-gray-300 px-3 py-2 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value="day">วันนี้</option>
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
          </select>
        )}
      </div>

      {showPaidOrders && (
        <div className="bg-indigo-50 p-4 rounded-lg shadow-sm mb-6 flex justify-around text-base font-semibold text-gray-700">
          <p>
            จำนวนออเดอร์: <span className="font-bold">{totalCount}</span>
          </p>
          <p>
            ยอดรวม: <span className="font-bold">{totalRevenue.toLocaleString()} บาท</span>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <svg
            className="animate-spin h-10 w-10 text-indigo-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </div>
      ) : sortedOrders.length === 0 ? (
        <p className="text-center text-gray-600 text-lg mt-12">ไม่มีออเดอร์ในรายการนี้</p>
      ) : (
        <div className="space-y-6">
          {sortedOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-lg shadow-md border border-gray-200 p-5 relative"
            >
              
              <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {order.customerName && order.customerName.trim() !== ''
                      ? 'ชื่อลูกค้า:'
                      : order.tableNumber && order.tableNumber.trim() !== ''
                        ? 'โต๊ะ:'
                        : 'ไม่ระบุโต๊ะ/ลูกค้า'}{' '}
                    <span className="text-indigo-700">
                      {order.customerName && order.customerName.trim() !== ''
                        ? order.customerName
                        : order.tableNumber || '-'}
                    </span>
                  </p>



                  <p className="text-sm text-gray-500">
                    สั่งเมื่อ: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    รวมราคา:{' '}
                    <span className="text-green-700 font-bold">
                      {order.totalPrice.toLocaleString()} บาท
                    </span>
                    {order.queueNumber && (
                      <span className="bg-indigo-200 text-indigo-700 font-bold px-2 py-1 ml-2 rounded-full shadow">
                        คิว {order.queueNumber}
                      </span>
                    )}
                  </p>

                  <p className="text-sm mt-1 text-gray-700">
                    สถานะปัจจุบัน:{' '}
                    {showPaidOrders ? (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold rounded px-2 py-1 ${STATUS_LIST.find(
                          (s) => s.key === 'paid'
                        )?.colorClass}`}
                      >
                        {STATUS_LIST.find((s) => s.key === 'paid')?.icon}
                        {STATUS_LIST.find((s) => s.key === 'paid')?.label}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold rounded px-2 py-1 ${STATUS_LIST.find(
                          (s) => s.key === order.status
                        )?.colorClass}`}
                      >
                        {STATUS_LIST.find((s) => s.key === order.status)?.icon}
                        {STATUS_LIST.find((s) => s.key === order.status)?.label || order.status}
                      </span>
                    )}
                  </p>
                  {!showPaidOrders && order.isCallBill && (
                    <p className="mt-2 text-red-600 font-semibold">ลูกค้าเรียกเช็คบิล</p>
                  )}
                </div>
              </div>

              <ul className="mb-6 list-disc list-inside text-gray-700">
                {order.items.map((item, idx) => (
                  <li key={idx}>
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


              {!showPaidOrders && (
                <div className="flex flex-wrap gap-3">
                  {STATUS_LIST.map((status) => {
                    const isActive = order.status === status.key;
                    return (
                      <button
                        key={status.key}
                        disabled={updatingOrderId === order._id}
                        onClick={() => updateStatus(order._id, status.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm transition
                          ${
                            isActive
                              ? STATUS_LIST.find((s) => s.key === status.key)?.colorClass
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                          ${updatingOrderId === order._id ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {status.icon}
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ปุ่มลบออเดอร์ */}
              <button
                onClick={() => deleteOrder(order._id)}
                disabled={updatingOrderId === order._id}
                className="absolute bottom-4 right-4 text-red-600 hover:text-red-800 transition"
                title="ลบออเดอร์"
              >
                <FiTrash2 size={22} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
