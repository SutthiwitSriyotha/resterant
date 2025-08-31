'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { FaUserCircle, FaDownload } from 'react-icons/fa';
import QRCode from 'react-qr-code';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

interface Menu {
  _id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  addOns?: AddOn[];
}

export default function DashboardPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('ชื่อร้านของคุณ');
  const [hasTables, setHasTables] = useState(true);
  const [tableCount, setTableCount] = useState(1);
  const [savingTables, setSavingTables] = useState(false);
  const [tableSaved, setTableSaved] = useState(false);
  const [qrValue, setQrValue] = useState('');

  const qrRef = useRef<HTMLDivElement | null>(null);

  // เพิ่ม state สำหรับควบคุมการแสดง QR Code
  const [showQRCode, setShowQRCode] = useState(false);


  // ดึงข้อมูลร้านและเมนู
  useEffect(() => {
    async function fetchData() {
      try {
        const resMenus = await fetch('/api/store/menu/list');
        const resStore = await fetch('/api/store/info');

        if (resMenus.ok) {
          const data = await resMenus.json();
          setMenus(data.menus || []);
        }

        if (resStore.ok) {
          const data = await resStore.json();
          setStoreId(data.storeId || null);
          setStoreName(data.name || 'ชื่อร้านของคุณ');
          if (data.tableInfo) {
            setHasTables(data.tableInfo.hasTables);
            setTableCount(data.tableInfo.tableCount || 1);
            setTableSaved(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // สร้างค่า QR Code
  useEffect(() => {
    if (storeId) {
      setQrValue(`${window.location.origin}/order/${storeId}`);
    }
  }, [storeId]);

  // บันทึกการตั้งค่าโต๊ะ
  const saveTableSettings = async () => {
    setSavingTables(true);
    try {
      const res = await fetch('/api/store/updateTables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasTables, tableCount }),
      });
      const data = await res.json();
      if (data.success) setTableSaved(true);
    } catch (err) {
      console.error(err);
    }
    setSavingTables(false);
  };

  // ดาวน์โหลด QR Code พร้อมชื่อร้านเป็น PNG
  const downloadQRCodeWithName = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 300;
    const height = 350;
    canvas.width = width;
    canvas.height = height;

    // พื้นหลัง
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // ชื่อร้านด้านบน
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(storeName, width / 2, 40);

    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, (width - 200) / 2, 80, 200, 200); // วาง QR Code ด้านล่างชื่อร้าน
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');

      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `QR_${storeId}.png`;
      a.click();
    };

    img.src = url;
  };

  const disableTableSettings = loading || !storeId;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
          จัดการร้านของคุณ
        </h1>
        <Link href="/dashboard/profile" className="flex flex-col items-center group">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-gray-600 flex items-center justify-center shadow-md group-hover:bg-indigo-200 transition">
            <FaUserCircle className="w-8 h-8" />
          </div>
          <span className="text-sm sm:text-base text-gray-700 mt-1 group-hover:text-gray-800 font-medium">
            โปรไฟล์
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Link href="/dashboard/menu" className="flex-1 min-w-[140px] px-4 py-2 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition text-center font-medium text-sm sm:text-base">
          จัดการเมนูอาหาร
        </Link>
        <Link href="/dashboard/orders" className="flex-1 min-w-[140px] px-4 py-2 sm:px-5 sm:py-3 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 transition text-center font-medium text-sm sm:text-base">
          จัดการออร์เดอร์
        </Link>
        {storeId && (
          <Link href={`/order/${storeId}`} className="flex-1 min-w-[140px] px-4 py-2 sm:px-5 sm:py-3 bg-purple-600 text-white rounded-xl shadow-md hover:bg-purple-700 transition text-center font-medium text-sm sm:text-base">
            หน้าออเดอร์ลูกค้า
          </Link>
        )}
      </div>

      {/* ตั้งค่าโต๊ะ */}
      <div className="mb-8 p-5 sm:p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">ตั้งค่าโต๊ะร้าน</h2>
        {disableTableSettings ? (
          <p className="text-gray-500">กำลังโหลดข้อมูลร้านของท่าน... กรุณารอสักครู่</p>
        ) : tableSaved ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-gray-900 text-sm sm:text-base font-medium">
              สถานะโต๊ะ: {hasTables ? `${tableCount} โต๊ะ` : 'ไม่มีโต๊ะ'}
            </p>
            <button onClick={() => setTableSaved(false)} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm sm:text-base font-medium">
              แก้ไข
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-sm sm:text-base">
            <label className="flex items-center gap-2 text-gray-900 font-medium">
              <input type="radio" name="tables" checked={hasTables} onChange={() => setHasTables(true)} className="w-5 h-5"/>
              ร้านมีโต๊ะ
            </label>
            {hasTables && (
              <input type="number" min={1} value={tableCount} onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                className="border border-gray-300 px-3 py-2 rounded-md w-32 sm:w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-black"
                placeholder="จำนวนโต๊ะ"/>
            )}
            <label className="flex items-center gap-2 text-gray-900 font-medium">
              <input type="radio" name="tables" checked={!hasTables} onChange={() => { setHasTables(false); setTableCount(0); }} className="w-5 h-5"/>
              ร้านไม่มีโต๊ะ
            </label>
            <button onClick={saveTableSettings} disabled={savingTables} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition text-sm sm:text-base font-medium">
              {savingTables ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        )}
      </div>

      {/* QR Code พร้อมชื่อร้านและดาวน์โหลด */}
      {storeId && (
        <div className="mb-8 p-5 sm:p-6 bg-white rounded-xl shadow-md flex flex-col gap-4">
          {/* Header ของการ์ดพร้อมปุ่มขวาสุด */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              QR สั่งอาหาร
            </h2>
            <button
              onClick={() => setShowQRCode(!showQRCode)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm sm:text-base font-medium focus:outline-none"
            >
              {showQRCode ? 'ไม่ต้องแสดง' : 'แสดง QR Code'}
            </button>
          </div>

          {/* ส่วน QR Code */}
          {showQRCode && (
            <>
              <div ref={qrRef} className="flex flex-col items-center gap-2">
                <span className="font-semibold text-gray-900 text-base sm:text-lg">{storeName}</span>
                <QRCode value={qrValue} size={200} />
              </div>
              <button
                onClick={downloadQRCodeWithName}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm sm:text-base font-medium"
              >
                <FaDownload /> ดาวน์โหลด QR Code
              </button>
            </>
          )}
        </div>
      )}


      {/* เมนูอาหาร */}
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">เมนูที่เพิ่มไว้</h2>
      {loading ? (
        <p className="text-gray-800 text-sm sm:text-base">กำลังโหลดเมนูร้าน... </p>
      ) : menus.length === 0 ? (
        <p className="text-gray-800 text-sm sm:text-base">ยังไม่มีเมนูอาหาร</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <li key={menu._id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition flex flex-col">
              {menu.image && <img src={menu.image} alt={menu.name} className="w-full h-40 sm:h-48 object-cover rounded-lg mb-3"/>}
              <h3 className="font-semibold text-gray-900 text-base sm:text-sm">{menu.name}</h3>
              <p className="text-gray-800 font-medium text-sm sm:text-sm mt-1">ราคา: {menu.price} บาท</p>
              {menu.description && <p className="text-gray-700 text-sm sm:text-sm mt-1">{menu.description}</p>}
              {menu.addOns && menu.addOns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {menu.addOns.map((a) => (
                    <span key={a.id} className="text-gray-900 sm:text-sm bg-gray-200 px-2 py-1 rounded-full font-medium">
                      {a.name} +{a.price} บาท
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
