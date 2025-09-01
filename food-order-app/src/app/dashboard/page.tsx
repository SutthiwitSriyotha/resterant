'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { FaUserCircle, FaDownload } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import useSWR from 'swr';

interface AddOn { id: string; name: string; price: number; }
interface Menu { _id: string; name: string; price: number; image?: string; description?: string; addOns?: AddOn[]; }
interface Store { _id: string; name: string; profileImage?: string; tableInfo?: { hasTables: boolean; tableCount: number; }; }

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
  // ใช้ SWR
  const { data: menuData, error: menuError, isLoading: menuLoading, mutate: mutateMenus } = useSWR('/api/store/menu/list', fetcher);
  const { data: storeData, error: storeError, isLoading: storeLoading, mutate: mutateStore } = useSWR('/api/store/profile', fetcher);

  const store: Store | null = storeData?.store || null;
  const menus: Menu[] = menuData?.menus || [];

  const [savingTables, setSavingTables] = useState(false);
  const [tableSaved, setTableSaved] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'qr' | 'menu'>('table');
  const qrRef = useRef<HTMLDivElement | null>(null);

  // เซ็ตค่าเริ่มต้นโต๊ะเมื่อ store โหลดแล้ว
  const [hasTables, setHasTables] = useState(true);
  const [tableCount, setTableCount] = useState(1);

  useEffect(() => {
    if (store?.tableInfo) {
      setHasTables(store.tableInfo.hasTables);
      setTableCount(store.tableInfo.tableCount || 1);
      setTableSaved(true);
    }
    if (store?._id) {
      setQrValue(`${window.location.origin}/order/${store._id}`);
    }
  }, [store]);

  const saveTableSettings = async () => {
    setSavingTables(true);
    try {
      const res = await fetch('/api/store/updateTables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasTables, tableCount }),
      });
      const data = await res.json();
      if (data.success) {
        setTableSaved(true);
        mutateStore(); // รีโหลด store data
      }
    } catch (err) {
      console.error(err);
    }
    setSavingTables(false);
  };

  const downloadQRCodeWithName = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = 300, height = 350;
    canvas.width = width; canvas.height = height;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(store?.name || '', width / 2, 40);
    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => { 
      ctx.drawImage(img, (width-200)/2, 80, 200, 200); 
      URL.revokeObjectURL(url); 
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a'); 
      a.href = pngUrl; 
      a.download = `QR_${store?._id}.png`; 
      a.click();
    };
    img.src = url;
  };

  const disableTableSettings = storeLoading || !store?._id;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <div className="flex justify-between items-center bg-green-400 px-6 py-6 shadow-md">
        <div className="text-gray-900 font-bold text-xl">
          Dashboard {store?.name ? ` ${store.name}` : ''}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/menu" className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition ">จัดการเมนูอาหาร</Link>
          <Link href="/dashboard/orders" className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition">จัดการออร์เดอร์</Link>
          {store?._id && <Link href={`/order/${store._id}`} className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition">หน้าออเดอร์ลูกค้า</Link>}
          {/* โปรไฟล์ */}
          <Link href="/dashboard/profile" className="ml-4 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-white">
              {store?.profileImage ? <img src={store.profileImage} alt="Profile" className="w-full h-full object-cover"/> : <FaUserCircle className="w-8 h-8 text-gray-700"/>}
            </div>
          </Link>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-64 bg-green-100 text-gray-900 flex flex-col p-4 gap-4">
          <button 
            onClick={() => setActiveTab('table')} 
            className={`p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='table' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition`}
          >
            ตั้งค่าโต๊ะร้าน
          </button>
          <button 
            onClick={() => setActiveTab('qr')} 
            className={`p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='qr' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition`}
          >
            QR สั่งอาหาร
          </button>
          <button 
            onClick={() => setActiveTab('menu')} 
            className={`p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='menu' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition`}
          >
            เมนูที่เพิ่มไว้
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto relative">
          {activeTab==='table' && (
            <div className="bg-white rounded-xl shadow-md p-6 animate-slide-in">
              <h2 className="text-lg font-semibold mb-4">ตั้งค่าโต๊ะร้าน</h2>
              {disableTableSettings ? <p>กำลังโหลด...</p> :
                tableSaved ? (
                  <div className="flex justify-between items-center">
                    <p>สถานะโต๊ะ: {hasTables ? `${tableCount} โต๊ะ` : 'ไม่มีโต๊ะ'}</p>
                    <button onClick={()=>setTableSaved(false)} className="px-4 py-2 bg-yellow-500 text-white rounded">แก้ไข</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2"><input type="radio" checked={hasTables} onChange={()=>setHasTables(true)}/> ร้านมีโต๊ะ</label>
                    {hasTables && <input type="number" value={tableCount} onChange={(e)=>setTableCount(parseInt(e.target.value)||1)} className="border px-2 py-1 rounded w-24"/>}
                    <label className="flex items-center gap-2"><input type="radio" checked={!hasTables} onChange={()=>{setHasTables(false); setTableCount(0)}}/> ร้านไม่มีโต๊ะ</label>
                    <button onClick={saveTableSettings} disabled={savingTables} className="px-4 py-2 bg-indigo-600 text-white rounded">{savingTables?'กำลังบันทึก...':'บันทึก'}</button>
                  </div>
                )
              }
            </div>
          )}

          {activeTab==='qr' && store?._id && (
            <div className="bg-white rounded-xl shadow-md p-6 animate-slide-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">QR สั่งอาหาร</h2>
                <button onClick={()=>setShowQRCode(!showQRCode)} className="px-3 py-1 bg-indigo-600 text-white rounded">{showQRCode?'ไม่ต้องแสดง':'แสดง QR Code'}</button>
              </div>
              {showQRCode && (
                <div className="flex flex-col items-center gap-3">
                  <div ref={qrRef}><QRCode value={qrValue} size={200}/></div>
                  <button onClick={downloadQRCodeWithName} className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2"><FaDownload/> ดาวน์โหลด QR Code</button>
                </div>
              )}
            </div>
          )}

          {activeTab==='menu' && (
            <div className="bg-white rounded-xl shadow-md p-6 animate-slide-in">
              <h2 className="text-lg font-semibold mb-4">เมนูที่เพิ่มไว้</h2>
              {menuLoading ? <p>กำลังโหลดเมนูร้าน...</p> : menus.length===0 ? <p>ยังไม่มีเมนูอาหาร</p> :
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {menus.map(menu=>(
                    <li key={menu._id} className="bg-gray-100 rounded-xl shadow-md p-4 flex flex-col gap-2">
                      {menu.image && <img src={menu.image} alt={menu.name} className="w-full h-40 object-cover rounded-lg"/>}
                      <h3 className="font-semibold">{menu.name}</h3>
                      <p>ราคา: {menu.price} บาท</p>
                      {menu.description && <p>{menu.description}</p>}
                      {menu.addOns && menu.addOns.length>0 && <div className="flex flex-wrap gap-1">{menu.addOns.map(a=><span key={a.id} className="text-sm bg-gray-200 px-2 py-1 rounded-full">{a.name}+{a.price}</span>)}</div>}
                    </li>
                  ))}
                </ul>
              }
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        @keyframes slideIn { from { transform: translateX(50px); opacity:0; } to { transform: translateX(0); opacity:1; } }
      `}</style>
    </div>
  );
}
