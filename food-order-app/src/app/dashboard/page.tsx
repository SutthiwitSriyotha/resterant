'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { FaUserCircle, FaDownload } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';

interface AddOn { id: string; name: string; price: number; }
interface Menu { _id: string; name: string; price: number; image?: string; description?: string; addOns?: AddOn[]; }
interface Store { _id: string; name: string; profileImage?: string; tableInfo?: { hasTables: boolean; tableCount: number; }; }

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
  const { data: menuData, isLoading: menuLoading, mutate: mutateMenus } = useSWR('/api/store/menu/list', fetcher);
  const { data: storeData, isLoading: storeLoading, mutate: mutateStore } = useSWR('/api/store/profile', fetcher);

  const store: Store | null = storeData?.store || null;
  const menus: Menu[] = menuData?.menus || [];

  const [savingTables, setSavingTables] = useState(false);
  const [tableSaved, setTableSaved] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'qr' | 'menu'>('table');
  const qrRef = useRef<HTMLDivElement | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


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
        mutateStore();
        toast.success('บันทึกโต๊ะเรียบร้อยแล้ว');
      } else {
        toast.error('ไม่สามารถแก้ไขข้อมูลโต๊ะได้');
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingTables(false);
    }
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
      <Toaster position="top-right" />
      
      {/* Navbar */}
      <div className="flex justify-between items-center bg-green-400 px-2 py-4 shadow-md relative">
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="px-2 py-1 bg-white text-gray-900 rounded-lg shadow"
          >
            ☰ 
          </button>

          {/* Popup menu */}
          {showMobileMenu && (
            <div className="absolute top-14 left-4 bg-white shadow-lg rounded-xl p-3 flex flex-col gap-2 w-48 z-50">
              <Link href="/dashboard/menu" className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">จัดการเมนูอาหาร</Link>
              <Link href="/dashboard/orders" className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">จัดการออร์เดอร์</Link>
              {store?._id && (
                <Link href={`/order/${store._id}`} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  หน้าออเดอร์ลูกค้า
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="text-gray-900 font-bold text-x md:text-xl text-base md:text-left">
          Dashboard {store?.name ? ` ${store.name}` : ''}
        </div>

        <div className="flex items-center gap-3 md:gap-3">
          {/* Desktop buttons */}
          <div className="hidden md:flex gap-3">
            <Link href="/dashboard/menu" className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition">จัดการเมนูอาหาร</Link>
            <Link href="/dashboard/orders" className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition">จัดการออร์เดอร์</Link>
            {store?._id && <Link href={`/order/${store._id}`} className="px-3 py-1 bg-white text-gray-900 rounded-xl hover:bg-gray-200 transition">หน้าออเดอร์ลูกค้า</Link>}
          </div>

          {/* Profile */}
          <Link href="/dashboard/profile" className="ml-4 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-white">
              {store?.profileImage ? <img src={store.profileImage} alt="Profile" className="w-full h-full object-cover"/> : <FaUserCircle className="w-8 h-8 text-gray-700"/>}
            </div>
          </Link>
        </div>
      </div>


      {/* Main layout */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-green-100 text-gray-900 flex md:flex-col flex-row p-2 md:p-4 gap-2 md:gap-4 overflow-x-auto md:overflow-auto">
          <button onClick={() => setActiveTab('table')} className={`flex-1 md:flex-none p-2 md:p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='table' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition text-sm md:text-base`}>ตั้งค่าโต๊ะร้าน</button>
          <button onClick={() => setActiveTab('qr')} className={`flex-1 md:flex-none p-2 md:p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='qr' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition text-sm md:text-base`}>QR สั่งอาหาร</button>
          <button onClick={() => setActiveTab('menu')} className={`flex-1 md:flex-none p-2 md:p-3 rounded-lg text-left border border-gray-300 shadow-sm ${activeTab==='menu' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-100 hover:bg-green-200'} transition text-sm md:text-base`}>เมนูที่เพิ่มไว้</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto relative">
          {activeTab==='table' && (
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 animate-slide-in">
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">ตั้งค่าโต๊ะร้าน</h2>
              {disableTableSettings ? <p>กำลังโหลด...</p> :
                tableSaved ? (
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <p>สถานะโต๊ะ: {hasTables ? `${tableCount} โต๊ะ` : 'ไม่มีโต๊ะ'}</p>
                    <button onClick={()=>setTableSaved(false)} className="px-3 py-1 bg-yellow-500 text-white rounded text-xs md:text-sm">แก้ไข</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 md:gap-3 text-sm md:text-base">
                    <label className="flex items-center gap-2"><input type="radio" checked={hasTables} onChange={()=>setHasTables(true)}/> ร้านมีโต๊ะ</label>
                    {hasTables && <input type="number" value={tableCount} onChange={(e)=>setTableCount(parseInt(e.target.value)||1)} className="border px-2 py-1 rounded w-20 md:w-24 text-sm md:text-base"/>}
                    <label className="flex items-center gap-2"><input type="radio" checked={!hasTables} onChange={()=>{setHasTables(false); setTableCount(0)}}/> ร้านไม่มีโต๊ะ</label>
                    <button onClick={saveTableSettings} disabled={savingTables} className="px-3 py-1 md:px-4 md:py-2 bg-indigo-600 text-white rounded text-sm md:text-base">{savingTables?'กำลังบันทึก...':'บันทึก'}</button>
                  </div>
                )
              }
            </div>
          )}

          {activeTab==='qr' && store?._id && (
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 animate-slide-in">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h2 className="text-base md:text-lg font-semibold">QR สั่งอาหาร</h2>
                <button onClick={()=>setShowQRCode(!showQRCode)} className="px-3 py-1 md:px-3 md:py-1 bg-indigo-600 text-white rounded text-sm md:text-base">{showQRCode?'ไม่ต้องแสดง':'แสดง QR Code'}</button>
              </div>
              {showQRCode && (
                <div className="flex flex-col items-center gap-2 md:gap-3">
                  <div ref={qrRef}><QRCode value={qrValue} size={150}/></div>
                  <button onClick={downloadQRCodeWithName} className="px-3 py-1 md:px-4 md:py-2 bg-indigo-600 text-white rounded flex items-center gap-2 text-sm md:text-base"><FaDownload/> ดาวน์โหลด QR Code</button>
                </div>
              )}
            </div>
          )}

          {activeTab==='menu' && (
            <div className="bg-white rounded-xl shadow-md p-4 md:p-6 animate-slide-in">
              <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">เมนูที่เพิ่มไว้</h2>
              {menuLoading ? <p>กำลังโหลดเมนูร้าน...</p> : menus.length===0 ? <p>ยังไม่มีเมนูอาหาร</p> :
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {menus.map(menu=>(<li key={menu._id} className="bg-gray-100 rounded-xl shadow-md p-3 md:p-4 flex flex-col gap-1 md:gap-2">
                      {menu.image && <img src={menu.image} alt={menu.name} className="w-full h-32 md:h-40 object-cover rounded-lg"/>}
                      <h3 className="font-semibold text-sm md:text-base">{menu.name}</h3>
                      <p className="text-xs md:text-sm">ราคา: {menu.price} บาท</p>
                      {menu.description && <p className="text-xs md:text-sm">{menu.description}</p>}
                      {menu.addOns && menu.addOns.length>0 && <div className="flex flex-wrap gap-1 text-xs md:text-sm">{menu.addOns.map(a=><span key={a.id} className="bg-gray-200 px-2 py-1 rounded-full">{a.name}+{a.price}</span>)}</div>}
                    </li>))}
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
