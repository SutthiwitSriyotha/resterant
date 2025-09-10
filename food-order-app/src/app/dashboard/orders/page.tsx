'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  FiCheckCircle,
  FiClock,
  FiBox,
  FiTruck,
  FiDollarSign,
  FiCheck,
  FiTrash2,
  FiMenu,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type AddOn = { id: string; name: string; price: number };
type OrderItem = { name: string; quantity: number; comment?: string; addOns?: AddOn[] };
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

type PaidTimeFilter = 'today' | 'yesterday' | 'week' | 'month';

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [showPaidOrders, setShowPaidOrders] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paidTimeFilter, setPaidTimeFilter] = useState<PaidTimeFilter>('today');
  const [showSummary, setShowSummary] = useState(false);
  const [graphType, setGraphType] = useState<'line' | 'bar'>('line');
  const [isSlideOpen, setIsSlideOpen] = useState(true);

  useEffect(() => {
    fetchStoreInfo();
    fetchOrders();
  }, []);

  const fetchStoreInfo = async () => {
    try {
      const res = await axios.get('/api/auth/me', { withCredentials: true });
      setIsSuspended(res.data?.user?.isSuspended || false);
    } catch (err) {
      console.error('โหลดข้อมูลร้านไม่สำเร็จ', err);
      toast.error('โหลดข้อมูลร้านไม่สำเร็จ');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/order/list', { withCredentials: true });
      setOrders(res.data.orders || []);
    } catch (err: any) {
      if (err.response?.status === 401) window.location.href = '/login';
      else toast.error('เกิดข้อผิดพลาดในการโหลดออเดอร์');
      console.error(err);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (isSuspended || updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      const res = await axios.put('/api/order/updateStatus', { orderId, status: newStatus });
      if (res.data.success) {
        fetchOrders();
        toast.success(`อัปเดตสถานะเป็น "${STATUS_LIST.find(s => s.key === newStatus)?.label}" เรียบร้อย`);
      } else {
        toast.error(res.data.message || 'อัปเดตสถานะล้มเหลว');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('ร้านถูกระงับ');
        setIsSuspended(true);
      } else {
        toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
        console.error(error);
      }
    }
    setUpdatingOrderId(null);
  };

  const deleteOrder = (orderId: string) => {
    if (isSuspended) return toast.error('ร้านถูกระงับ ไม่สามารถลบออเดอร์ได้');

    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <span>คุณแน่ใจว่าจะลบออเดอร์นี้หรือไม่?</span>
          <div className="flex gap-2 justify-end">
            <button className="px-3 py-1 bg-gray-400 rounded hover:bg-gray-700 " onClick={() => toast.dismiss(t.id)}>ยกเลิก</button>
            <button
              className="px-3 py-1 bg-red-500 rounded hover:bg-red-600 text-white"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/order/delete?orderId=${orderId}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (data.success) {
                    toast.success('ลบออเดอร์สำเร็จ');
                    fetchOrders();
                  } else {
                    toast.error(`ลบออเดอร์ไม่สำเร็จ: ${data.message}`);
                  }
                } catch (err) {
                  toast.error('เกิดข้อผิดพลาดในการลบออเดอร์');
                  console.error(err);
                } finally {
                  toast.dismiss(t.id);
                }
              }}
            >
              ยืนยัน
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    );
  };

  const filterPaidOrdersByTime = (orders: Order[], filter: PaidTimeFilter) => {
    const now = new Date();
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (filter === 'today') return orderDate.toDateString() === now.toDateString();
      if (filter === 'yesterday') {
        const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
        return orderDate.toDateString() === yesterday.toDateString();
      }
      if (filter === 'week') {
        const weekStart = new Date(); weekStart.setDate(now.getDate() - now.getDay());
        return orderDate >= weekStart && orderDate <= now;
      }
      if (filter === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      return false;
    });
  };

  const filterByTimeRange = (orders: Order[]) => {
    if (!orders.length) return [];
    const now = new Date();

    return orders.filter(o => {
      const orderDate = new Date(o.createdAt);

      if (timeRange === 'day' && selectedDate) {
        const selected = new Date(selectedDate);
        return orderDate.toDateString() === selected.toDateString();
      }

      if (timeRange === 'week' && startDate) {
        const [yearStr, weekStr] = startDate.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        const firstDayOfWeek = new Date(year, 0, 1 + (week - 1) * 7);
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        return orderDate >= firstDayOfWeek && orderDate <= lastDayOfWeek;
      }

      if (timeRange === 'month' && selectedDate) {
        const [year, month] = selectedDate.split('-').map(Number);
        return orderDate.getFullYear() === year && orderDate.getMonth() === month - 1;
      }

      if (timeRange === 'day') return orderDate.toDateString() === now.toDateString();
      if (timeRange === 'week') return (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      if (timeRange === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();

      return true;
    });
  };

  const filteredOrders = showPaidOrders
    ? paidTimeFilter && !showSummary
      ? filterPaidOrdersByTime(orders.filter((o) => o.status === 'paid'), paidTimeFilter)
      : filterByTimeRange(orders.filter((o) => o.status === 'paid'))
    : orders.filter((o) => !['paid'].includes(o.status));

  const sortedOrders = [...filteredOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const totalRevenue = sortedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalCount = sortedOrders.length;

  const generateGraphData = (orders: Order[]) => {
    if (!orders.length) return [];
    let start = new Date(orders[0].createdAt);
    let end = new Date(orders[orders.length - 1].createdAt);
    if (timeRange === 'month') {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    }
    const dateMap: Record<string, { revenue: number; itemsSold: number }> = {};
    orders.forEach((order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString();
      if (!dateMap[dateStr]) dateMap[dateStr] = { revenue: 0, itemsSold: 0 };
      dateMap[dateStr].revenue += order.totalPrice;
      dateMap[dateStr].itemsSold += order.items.reduce((sum, i) => sum + i.quantity, 0);
    });
    const graph: { date: string; revenue: number; itemsSold: number }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toLocaleDateString();
      graph.push({ date: dateStr, revenue: dateMap[dateStr]?.revenue || 0, itemsSold: dateMap[dateStr]?.itemsSold || 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return graph;
  };

  const graphData = generateGraphData(sortedOrders);

  const downloadExcel = (orders: Order[], fileName: string) => {
    if (!orders.length) return toast.error('ไม่มีข้อมูลสำหรับดาวน์โหลด');

    const orderSheetData = orders.map(o => ({
      'วันที่': new Date(o.createdAt).toLocaleString(),
      'ชื่อลูกค้า/โต๊ะ': o.customerName || o.tableNumber || '-',
      'รายการอาหาร': o.items.map(i => `${i.name} ×${i.quantity} ${i.comment ? `(${i.comment})` : ''} ${(i.addOns || []).map(a => `${a.name}(+${a.price})`).join(', ')}`).join('; '),
      'รวมราคา': o.totalPrice,
      'สถานะ': o.status,
    }));

    const wsOrders = XLSX.utils.json_to_sheet(orderSheetData);

    const menuCount: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        menuCount[item.name] = (menuCount[item.name] || 0) + item.quantity;
      });
    });

    const sortedMenus = Object.entries(menuCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => ({ 'เมนู': name, 'จำนวนขาย': qty }));

    const wsSummary = XLSX.utils.json_to_sheet(sortedMenus);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ยอดขายเมนู');

    XLSX.writeFile(wb, fileName);
  };

  return (
  <div className="flex h-screen bg-gray-100">
    <Toaster position="top-center" />

    {/* Sidebar */}
    <div
      className={`fixed top-0 left-0 z-40 w-64 h-screen bg-green-100 shadow-lg transform transition-transform duration-300
        ${isSlideOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:shadow-none`}
    >
      <nav className="flex flex-col gap-2 p-4 text-gray-700 mt-16">
        <button
          onClick={() => { setShowPaidOrders(false); fetchOrders(); }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-left border border-gray-300 shadow-sm font-semibold transition
            ${!showPaidOrders 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-green-100 hover:bg-green-200 text-gray-700'}`}
        >
          ดูออเดอร์ที่ยังไม่เสร็จ
        </button>
        <button
          onClick={() => { setShowPaidOrders(true); fetchOrders(); }}
          className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-left border border-gray-300 shadow-sm font-semibold transition
            ${showPaidOrders 
              ? 'bg-green-600 text-white shadow-lg' 
              : 'bg-green-100 hover:bg-green-200 text-gray-700'}`}
        >
          ดูออเดอร์ที่เสร็จสิ้น
        </button>
      </nav>

    </div>

    {/* Main Content */}
    <div className="flex-1 flex flex-col">
      {/* Navbar */}
      <div className="flex items-center justify-between bg-green-400 text-gray-900 px-2 py-5 shadow-md fixed top-0 left-0 right-0 z-50">
        <h1 className="text-xl font-bold">จัดการออเดอร์</h1>
        <button className="md:hidden" onClick={() => setIsSlideOpen(!isSlideOpen)}>
          <FiMenu size={24} />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 mt-16">
        {/* การ์ดรวม content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* สรุป / เลือกช่วงเวลา / ดาวน์โหลด Excel */}
          {showPaidOrders && !showSummary && (
            <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-4 rounded-md shadow-sm text-gray-900">
              <label className="font-medium text-gray-700">เลือกช่วงเวลา:</label>
              <select
                value={paidTimeFilter}
                onChange={(e) => setPaidTimeFilter(e.target.value as PaidTimeFilter)}
                className="border px-3 py-1 rounded-md"
              >
                <option value="today">วันนี้</option>
                <option value="yesterday">เมื่อวาน</option>
                <option value="week">สัปดาห์นี้</option>
                <option value="month">เดือนนี้</option>
              </select>
              <button
                onClick={() => setShowSummary(true)}
                className="px-2 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                ดูสรุปทั้งหมด / กราฟ
              </button>
              <button
                onClick={() => downloadExcel(filteredOrders, `Order_Summary_${paidTimeFilter}.xlsx`)}
                className="px-2 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ดาวน์โหลด Excel
              </button>
            </div>
          )}

          {/* กราฟ */}
          {showPaidOrders && showSummary && (
            <div className="bg-gray-50 p-4 rounded-md shadow-sm w-full text-gray-900">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <label>ดูกราฟ:</label>
                <select
                  className="border px-3 py-2 rounded-md text-gray-900"
                  onChange={(e) => {
                    const value = e.target.value as 'day' | 'week' | 'month';
                    setTimeRange(value);
                    setSelectedDate('');
                    setStartDate('');
                    setEndDate('');
                  }}
                  value={timeRange}
                >
                  <option value="day">รายวัน</option>
                  <option value="week">รายสัปดาห์</option>
                  <option value="month">รายเดือน</option>
                </select>

                <label>ชนิดกราฟ:</label>
                <select
                  className="border px-3 py-2 rounded-md text-gray-900"
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value as 'line' | 'bar')}
                >
                  <option value="line">กราฟเส้น</option>
                  <option value="bar">กราฟแท่ง</option>
                </select>

                {timeRange === 'day' && (
                  <input
                    type="date"
                    className="border px-3 py-2 rounded-md text-gray-900"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                )}
                {timeRange === 'week' && (
                  <input
                    type="week"
                    className="border px-3 py-2 rounded-md text-gray-900"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                )}
                {timeRange === 'month' && (
                  <input
                    type="month"
                    className="border px-3 py-2 rounded-md text-gray-900"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                )}

                <button
                  onClick={() => setShowSummary(false)}
                  className="px-3 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-900"
                >
                  ย้อนกลับ
                </button>
              </div>

              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  {graphType === 'line' ? (
                    <LineChart data={graphData}>
                      <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} name="ยอดขาย (บาท)" />
                      <Line type="monotone" dataKey="itemsSold" stroke="#f59e0b" strokeWidth={2} name="จำนวนชิ้นที่ขาย" />
                      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                      <XAxis dataKey="date" stroke="#1f2937" />
                      <YAxis stroke="#1f2937" />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                    </LineChart>
                  ) : (
                    <BarChart data={graphData}>
                      <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                      <XAxis dataKey="date" stroke="#1f2937" />
                      <YAxis stroke="#1f2937" />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="revenue" fill="#4f46e5" name="ยอดขาย (บาท)" />
                      <Bar dataKey="itemsSold" fill="#f59e0b" name="จำนวนชิ้นที่ขาย" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* สรุปจำนวน/ยอดรวม */}
          {showPaidOrders && !showSummary && (
            <div className="bg-indigo-50 p-4 rounded-lg shadow-sm flex justify-around text-base font-semibold text-gray-700">
              <p>จำนวนออเดอร์: <span className="font-bold">{totalCount}</span></p>
              <p>ยอดรวม: <span className="font-bold">{totalRevenue.toLocaleString()} บาท</span></p>
            </div>
          )}

          {/* Loader / Orders List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : sortedOrders.length === 0 ? (
            <p className="text-center text-gray-600 text-lg mt-12">ไม่มีออเดอร์ในรายการนี้</p>
          ) : (
            <>
              {/* คิวที่เหลือ */}
              {!showPaidOrders && (
                <div className="flex justify-end mb-4">
                  <div className="bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg shadow">
                    คิวที่เหลือ: {orders.filter(o => ['pending','accepted','preparing','finished','delivering'].includes(o.status)).length}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {sortedOrders.map(order => (
                  <div key={order._id} className="bg-white rounded-lg shadow-md border border-gray-200 p-5 relative">
                    {/* ข้อมูลลูกค้า / โต๊ะ */}
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {order.customerName?.trim() ? 'ชื่อลูกค้า:' : order.tableNumber?.trim() ? 'โต๊ะ:' : 'ไม่ระบุโต๊ะ/ลูกค้า'}{' '}
                          <span className="text-indigo-700">{order.customerName || order.tableNumber || '-'}</span>
                        </p>
                        <p className="text-sm text-gray-500">สั่งเมื่อ: {new Date(order.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          รวมราคา: <span className="text-green-700 font-bold">{order.totalPrice.toLocaleString()} บาท</span>
                          {order.queueNumber && <span className="bg-indigo-200 text-indigo-700 font-bold px-2 py-1 ml-2 rounded-full shadow">คิว {order.queueNumber}</span>}
                        </p>
                        <p className="text-sm mt-1 text-gray-700">
                          สถานะปัจจุบัน:{' '}
                          {showPaidOrders ? (
                            <span className="inline-flex items-center gap-1 font-semibold rounded px-2 py-1 bg-green-600 text-white">
                              {STATUS_LIST.find(s => s.key === 'paid')?.icon}
                              {STATUS_LIST.find(s => s.key === 'paid')?.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold rounded px-2 py-1">
                              {STATUS_LIST.find(s => s.key === order.status)?.icon}
                              {STATUS_LIST.find(s => s.key === order.status)?.label || order.status}
                            </span>
                          )}
                        </p>
                        {!showPaidOrders && order.isCallBill && <p className="mt-2 text-red-600 font-semibold">ลูกค้าเรียกเช็คบิล</p>}
                      </div>
                    </div>

                    {/* รายการเมนู */}
                    <ul className="mb-6 list-disc list-inside text-gray-700">
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{item.name}</span> × {item.quantity}
                          {item.comment && <span className="italic text-green-800 ml-2">({item.comment})</span>}
                          {(item.addOns || []).length > 0 && <span className="ml-2 text-blue-400 italic">[Add: {(item.addOns || []).map(a => `${a.name}(+${a.price})`).join(', ')}]</span>}
                        </li>
                      ))}
                    </ul>

                    {/* ปุ่มเปลี่ยนสถานะ */}
                    {!showPaidOrders && (
                      <div className="flex flex-wrap gap-3">
                        {STATUS_LIST.map(status => (
                          <button
                            key={status.key}
                            disabled={isSuspended || updatingOrderId === order._id}
                            onClick={() => updateStatus(order._id, status.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm transition
                              ${isSuspended ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : order.status === status.key
                                ? STATUS_LIST.find(s => s.key === status.key)?.colorClass
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                              ${updatingOrderId === order._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {status.icon} {status.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ลบออเดอร์ */}
                    <button
                      onClick={() => deleteOrder(order._id)}
                      disabled={isSuspended || updatingOrderId === order._id}
                      className={`absolute bottom-4 right-4 ${isSuspended ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                      title="ลบออเดอร์"
                    >
                      <FiTrash2 size={22} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  </div>
);
}
