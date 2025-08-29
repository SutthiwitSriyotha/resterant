'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaUserCircle } from 'react-icons/fa';

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

  // store info
  const [storeId, setStoreId] = useState<string | null>(null);

  // สำหรับตั้งค่าโต๊ะ
  const [hasTables, setHasTables] = useState(true);
  const [tableCount, setTableCount] = useState(1);
  const [savingTables, setSavingTables] = useState(false);
  const [tableSaved, setTableSaved] = useState(false);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch('/api/store/menu/list');
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setMenus(data.menus || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchStoreInfo() {
      try {
        const res = await fetch('/api/store/info');
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setStoreId(data.storeId || null);
          if (data.tableInfo) {
            setHasTables(data.tableInfo.hasTables);
            setTableCount(data.tableInfo.tableCount || 1);
            setTableSaved(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch store info', error);
      }
    }

    fetchMenus();
    fetchStoreInfo();
  }, []);

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
      }
    } catch (error) {
      console.error(error);
    }
    setSavingTables(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white min-h-screen text-gray-900">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Dashboard</h1>

      {/* ลิงก์ไปจัดการเมนู/ออเดอร์ */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex gap-4">
          <Link
            href="/dashboard/menu"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition"
          >
            จัดการเมนูอาหาร
          </Link>
          <Link
            href="/dashboard/orders"
            className="px-5 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition"
          >
            จัดการออร์เดอร์
          </Link>

          {/* ปุ่มหน้าออเดอร์ลูกค้า */}
          {storeId && (
            <Link
              href={`/order/${storeId}`}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 transition"
            >
              หน้าออเดอร์ลูกค้า
            </Link>
          )}
        </div>

        <Link href="/dashboard/profile" className="flex flex-col items-center cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-gray-600 flex items-center justify-center shadow-md group-hover:bg-indigo-200 transition">
            <FaUserCircle className="w-8 h-8" />
          </div>
          <span className="text-sm text-gray-700 mt-1 group-hover:text-gray-800 transition font-medium">
            โปรไฟล์
          </span>
        </Link>
      </div>

      {/* ตั้งค่าโต๊ะ */}
      <div className="mb-8 p-4 border border-gray-300 rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">ตั้งค่าโต๊ะร้าน</h2>

        {tableSaved ? (
          <div className="mb-3">
            <p className="text-gray-700 mb-2">
              สถานะโต๊ะ: {hasTables ? `มีโต๊ะ (${tableCount} โต๊ะ)` : 'ไม่มีโต๊ะ'}
            </p>
            <button
              onClick={() => setTableSaved(false)}
              className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition"
            >
              แก้ไข
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tables"
                value="has"
                checked={hasTables}
                onChange={() => setHasTables(true)}
                className="w-5 h-5"
              />
              ร้านมีโต๊ะ
            </label>

            {hasTables && (
              <input
                type="number"
                min={1}
                value={tableCount}
                onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
                className="border border-gray-300 px-3 py-1 rounded-md w-24"
                placeholder="จำนวนโต๊ะ"
              />
            )}

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tables"
                value="none"
                checked={!hasTables}
                onChange={() => {
                  setHasTables(false);
                  setTableCount(0);
                }}
                className="w-5 h-5"
              />
              ร้านไม่มีโต๊ะ
            </label>

            <button
              onClick={saveTableSettings}
              disabled={savingTables}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition"
            >
              {savingTables ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        )}
      </div>

      {/* แสดงเมนูอาหาร */}
      <h2 className="text-xl font-semibold mb-4 text-gray-900">เมนูที่เพิ่มไว้</h2>

      {loading ? (
        <p className="text-gray-700">กำลังโหลดเมนู...</p>
      ) : menus.length === 0 ? (
        <p className="text-gray-700">ยังไม่มีเมนูอาหาร</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <li
              key={menu._id}
              className="border border-gray-300 rounded-xl p-4 shadow-sm bg-white hover:shadow-md transition"
            >
              {menu.image && (
                <img
                  src={menu.image}
                  alt={menu.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <h3 className="font-semibold text-gray-900">{menu.name}</h3>
              <p className="text-gray-800">ราคา: {menu.price} บาท</p>
              {menu.description && <p className="text-gray-600 mt-1">{menu.description}</p>}

              {menu.addOns && menu.addOns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {menu.addOns.map((a) => (
                    <span key={a.id} className="text-sm bg-gray-200 px-2 py-1 rounded">
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
