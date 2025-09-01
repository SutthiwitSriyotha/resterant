'use client';

import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { FaUserCircle, FaDownload, FaBars, FaTimes } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import useSWR from 'swr';
import toast, { Toaster } from 'react-hot-toast';

interface AddOn { id: string; name: string; price: number; }
interface Menu { _id: string; name: string; price: number; image?: string; description?: string; addOns?: AddOn[]; }
interface Store { _id: string; name: string; profileImage?: string; tableInfo?: { hasTables: boolean; tableCount: number; }; }

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DashboardPage() {
  const { data: menuData } = useSWR('/api/store/menu/list', fetcher);
  const { data: storeData } = useSWR('/api/store/profile', fetcher);

  const store: Store | null = storeData?.store || null;
  const menus: Menu[] = menuData?.menus || [];

  const [activeTab, setActiveTab] = useState<'table' | 'qr' | 'menu'>('table');
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const qrRef = useRef<HTMLDivElement | null>(null);

  const [hasTables, setHasTables] = useState(true);
  const [tableCount, setTableCount] = useState(1);
  const [tableSaved, setTableSaved] = useState(false);
  const [savingTables, setSavingTables] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (store?.tableInfo) {
      setHasTables(store.tableInfo.hasTables);
      setTableCount(store.tableInfo.tableCount || 1);
      setTableSaved(true);
    }
    if (store?._id) setQrValue(`${window.location.origin}/order/${store._id}`);
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
        toast.success('บันทึกโต๊ะเรียบร้อยแล้ว');
      } else toast.error('ไม่สามารถแก้ไขข้อมูลโต๊ะได้');
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally { setSavingTables(false); }
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
      const a = document.createElement('a'); a.href = pngUrl; a.download = `QR_${store?._id}.png`; a.click();
    };
    img.src = url;
  };

  const disableTableSettings = !store?._id;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative">
      <Toaster position="top-right" />

      {/* Navbar */}
      <div className="flex justify-between items-center bg-green-400 px-4 py-4 shadow-md">
        {/* Hamburger ปุ่มซ้าย */}
        {isMobile && (
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 bg-white rounded">
            <FaBars />
          </button>
        )}

        <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'} mx-2`}>
          Dashboard {store?.name || ''}
        </div>

        {/* โปรไฟล์ฝั่งขวา */}
        <Link href="/dashboard/profile" className="ml-auto flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-gray-300 flex items-center justify-center bg-white">
            {store?.profileImage ? <img src={store.profileImage} className="w-full h-full object-cover" /> : <FaUserCircle className="w-6 h-6 text-gray-700"/>}
          </div>
        </Link>
      </div>


      {/* Mobile sidebar popup */}
      {isMobile && showSidebar && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={()=>setShowSidebar(false)}></div>
          <div className="fixed top-0 left-0 w-64 h-full bg-green-100 shadow-lg z-50 p-4 flex flex-col gap-2 transform transition-transform duration-300 animate-slide-in">
            <button className="self-end mb-2" onClick={()=>setShowSidebar(false)}><FaTimes /></button>
            <button onClick={()=>{setActiveTab('table'); setShowSidebar(false)}} className={`p-3 rounded-lg ${activeTab==='table' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>ตั้งค่าโต๊ะร้าน</button>
            <button onClick={()=>{setActiveTab('qr'); setShowSidebar(false)}} className={`p-3 rounded-lg ${activeTab==='qr' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>QR สั่งอาหาร</button>
            <button onClick={()=>{setActiveTab('menu'); setShowSidebar(false)}} className={`p-3 rounded-lg ${activeTab==='menu' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>เมนูที่เพิ่มไว้</button>
          </div>
        </>
      )}

      {/* Top Buttons on Mobile */}
      {isMobile && (
        <div className="flex gap-2 p-2 bg-green-50 overflow-x-auto">
          <Link href="/dashboard/menu" className="px-3 py-1 bg-white rounded text-sm hover:bg-gray-200">จัดการเมนู</Link>
          <Link href="/dashboard/orders" className="px-3 py-1 bg-white rounded text-sm hover:bg-gray-200">จัดการออร์เดอร์</Link>
          {store?._id && <Link href={`/order/${store._id}`} className="px-3 py-1 bg-white rounded text-sm hover:bg-gray-200">หน้าออเดอร์ลูกค้า</Link>}
        </div>
      )}

      {/* Main Content */}
      <div className={`flex ${!isMobile ? '' : 'flex-col p-4'}`}>
        {!isMobile && (
          <div className="w-64 bg-green-100 flex flex-col p-4 gap-4">
            <button onClick={() => setActiveTab('table')} className={`p-3 rounded-lg ${activeTab==='table' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>ตั้งค่าโต๊ะร้าน</button>
            <button onClick={() => setActiveTab('qr')} className={`p-3 rounded-lg ${activeTab==='qr' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>QR สั่งอาหาร</button>
            <button onClick={() => setActiveTab('menu')} className={`p-3 rounded-lg ${activeTab==='menu' ? 'bg-green-600 text-white' : 'bg-green-200'}`}>เมนูที่เพิ่มไว้</button>
          </div>
        )}

        <div className="flex-1 p-4 overflow-auto">
          {activeTab==='table' && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="font-semibold mb-2 text-base">{isMobile ? 'ตั้งค่าโต๊ะร้าน (มือถือ)' : 'ตั้งค่าโต๊ะร้าน'}</h2>
              {disableTableSettings ? <p>กำลังโหลด...</p> :
                tableSaved ? (
                  <div className="flex justify-between items-center text-sm">
                    <p>สถานะโต๊ะ: {hasTables ? `${tableCount} โต๊ะ` : 'ไม่มีโต๊ะ'}</p>
                    <button onClick={()=>setTableSaved(false)} className="px-2 py-1 bg-yellow-500 text-white rounded text-sm">แก้ไข</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" checked={hasTables} onChange={()=>setHasTables(true)}/> ร้านมีโต๊ะ</label>
                    {hasTables && <input type="number" value={tableCount} onChange={(e)=>setTableCount(parseInt(e.target.value)||1)} className="border px-2 py-1 rounded w-20"/>}
                    <label className="flex items-center gap-2"><input type="radio" checked={!hasTables} onChange={()=>{setHasTables(false); setTableCount(0)}}/> ร้านไม่มีโต๊ะ</label>
                    <button onClick={saveTableSettings} disabled={savingTables} className="px-3 py-1 bg-indigo-600 text-white rounded">{savingTables?'กำลังบันทึก...':'บันทึก'}</button>
                  </div>
                )
              }
            </div>
          )}

          {activeTab==='qr' && store?._id && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-base">QR สั่งอาหาร</h2>
                <button onClick={()=>setShowQRCode(!showQRCode)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">{showQRCode?'ไม่ต้องแสดง':'แสดง QR Code'}</button>
              </div>
              {showQRCode && (
                <div className="flex flex-col items-center gap-2">
                  <div ref={qrRef}><QRCode value={qrValue} size={isMobile ? 150 : 200}/></div>
                  <button onClick={downloadQRCodeWithName} className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center gap-1 text-sm"><FaDownload/> ดาวน์โหลด QR Code</button>
                </div>
              )}
            </div>
          )}

          {activeTab==='menu' && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <h2 className="font-semibold mb-2 text-base">เมนูที่เพิ่มไว้</h2>
              {menus.length===0 ? <p className="text-sm">ยังไม่มีเมนูอาหาร</p> :
                <ul className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
                  {menus.map(menu=>(
                    <li key={menu._id} className="bg-gray-100 rounded-xl shadow-md p-2 flex flex-col gap-1 text-sm">
                      {menu.image && <img src={menu.image} alt={menu.name} className="w-full h-32 object-cover rounded-lg"/>}
                      <h3 className="font-semibold">{menu.name}</h3>
                      <p>ราคา: {menu.price} บาท</p>
                      {menu.description && <p>{menu.description}</p>}
                      {menu.addOns && menu.addOns.length>0 && <div className="flex flex-wrap gap-1">{menu.addOns.map(a=><span key={a.id} className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{a.name}+{a.price}</span>)}</div>}
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
        @keyframes slideIn { from { transform: translateX(-100%); opacity:0; } to { transform: translateX(0); opacity:1; } }
      `}</style>
    </div>
  );
}
