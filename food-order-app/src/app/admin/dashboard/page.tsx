'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import toast, { Toaster } from 'react-hot-toast'
import { FaTrash, FaTimes, FaSignOutAlt } from 'react-icons/fa'

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
  return res.json()
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data: stores, error, mutate } = useSWR('/api/admin/stores', fetcher)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())

  // ตรวจสอบ admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (!res.ok) throw new Error('Unauthorized')
        const data = await res.json()
        if (data.role !== 'admin') router.push('/login')
      } catch {
        router.push('/login')
      }
    }
    checkAdmin()
  }, [router])

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('ออกจากระบบไม่สำเร็จ')
      toast.success('ออกจากระบบเรียบร้อย')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDeleteStore = async (id: string) => {
    if (!confirm('ต้องการลบร้านค้านี้และข้อมูลทั้งหมดหรือไม่?')) return
    try {
      const res = await fetch(`/api/admin/stores/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success('ลบร้านค้าเรียบร้อย')
      mutate()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSuspend = async (id: string, suspend: boolean) => {
    try {
      const res = await fetch(`/api/admin/stores/${id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: suspend }),
      })
      if (!res.ok) throw new Error('เปลี่ยนสถานะไม่สำเร็จ')
      toast.success(suspend ? 'ระงับร้านแล้ว' : 'ปลดระงับแล้ว')
      mutate()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleViewStore = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/stores/${id}`)
      if (!res.ok) throw new Error('โหลดข้อมูลร้านไม่สำเร็จ')
      const data = await res.json()
      setSelectedStore(data.store)
      setSelectedMenus(new Set())
      setSelectedOrders(new Set())
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const toggleSelectMenu = (id: string) => {
    setSelectedMenus(prev => {
      const newSet = new Set(prev)
      newSet.has(id) ? newSet.delete(id) : newSet.add(id)
      return newSet
    })
  }

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      newSet.has(id) ? newSet.delete(id) : newSet.add(id)
      return newSet
    })
  }

  const handleDeleteSelectedMenus = async () => {
    if (selectedMenus.size === 0) return
    if (!confirm(`ต้องการลบ ${selectedMenus.size} เมนูที่เลือกหรือไม่?`)) return
    try {
      await Promise.all(
        Array.from(selectedMenus).map(id =>
          fetch(`/api/admin/menus/${id}`, { method: 'DELETE' })
        )
      )
      toast.success('ลบเมนูเรียบร้อย')
      handleViewStore(selectedStore._id) // โหลดข้อมูลร้านใหม่
      setSelectedMenus(new Set())
    } catch {
      toast.error('ลบเมนูไม่สำเร็จ')
    }
  }

  const handleDeleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) return
    if (!confirm(`ต้องการลบ ${selectedOrders.size} ออเดอร์ที่เลือกหรือไม่?`)) return
    try {
      await Promise.all(
        Array.from(selectedOrders).map(id =>
          fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
        )
      )
      toast.success('ลบออเดอร์เรียบร้อย')
      handleViewStore(selectedStore._id) // โหลดข้อมูลร้านใหม่
      setSelectedOrders(new Set())
    } catch {
      toast.error('ลบออเดอร์ไม่สำเร็จ')
    }
  }

  if (error) return <p className="text-red-600">โหลดข้อมูลร้านค้าไม่สำเร็จ</p>
  if (!stores) return <p className="text-gray-600">กำลังโหลด...</p>

  return (
    <div className="p-6 bg-white min-h-screen text-gray-800 relative">
      <Toaster />

      {/* ปุ่มออกจากระบบ */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded flex items-center gap-2"
      >
        <FaSignOutAlt /> ออกจากระบบ
      </button>

      <h1 className="text-2xl font-bold mb-6">ระบบจัดการร้านค้า (Admin)</h1>

      <table className="w-full border border-gray-200 shadow-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-2 text-left">ชื่อร้าน</th>
            <th className="p-2 text-left">อีเมล</th>
            <th className="p-2 text-left">วันที่สมัคร</th>
            <th className="p-2 text-left">สถานะ</th>
            <th className="p-2 text-left">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store: any) => (
            <tr key={store._id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="p-2">{store.name}</td>
              <td className="p-2">{store.email}</td>
              <td className="p-2">{new Date(store.createdAt).toLocaleDateString()}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-sm ${store.isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {store.isSuspended ? 'ระงับแล้ว' : 'ปกติ'}
                </span>
              </td>
              <td className="p-2 flex gap-2">
                <button onClick={() => handleDeleteStore(store._id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">ลบร้าน</button>
                <button onClick={() => handleSuspend(store._id, !store.isSuspended)} className="px-3 py-1 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500">{store.isSuspended ? 'ปลดระงับ' : 'ระงับ'}</button>
                <button onClick={() => handleViewStore(store._id)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">ดูรายละเอียด</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal ดูรายละเอียดร้าน */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-11/12 max-w-4xl overflow-y-auto max-h-[85vh] shadow-lg">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-gray-800">{selectedStore.name}</h2>
              <button onClick={() => setSelectedStore(null)} className="text-gray-500 hover:text-gray-700"><FaTimes size={20} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p><strong>ผู้ติดต่อ:</strong> {selectedStore.ownerName || '-'}</p>
                <p><strong>เบอร์โทร:</strong> {selectedStore.phone || '-'}</p>
                <p><strong>อีเมล:</strong> {selectedStore.email}</p>
              </div>
              <div>
                <p><strong>สถานะ:</strong> <span className={`px-2 py-1 rounded text-sm ${selectedStore.isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{selectedStore.isSuspended ? 'ระงับแล้ว' : 'ปกติ'}</span></p>
                <p><strong>สมัครเมื่อ:</strong> {new Date(selectedStore.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">📋 เมนู</h3>
            {selectedStore.menus?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  {selectedStore.menus.map((menu: any) => (
                    <div key={menu._id} onClick={() => toggleSelectMenu(menu._id)} className={`border rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${selectedMenus.has(menu._id) ? 'bg-red-50 border-red-300' : ''}`}>
                      <div>
                        <p className="font-medium">{menu.name}</p>
                        <p className="text-sm text-gray-600">{menu.price} บาท</p>
                      </div>
                      <FaTrash className="text-red-500" />
                    </div>
                  ))}
                </div>
                {selectedMenus.size > 0 && <button onClick={handleDeleteSelectedMenus} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mb-4">ลบ {selectedMenus.size} เมนูที่เลือก</button>}
              </>
            ) : (
              <p className="text-gray-500 mb-6">ไม่มีเมนู</p>
            )}

            <h3 className="text-lg font-semibold mb-2">🛒 ออเดอร์</h3>
            {selectedStore.orders?.length > 0 ? (
              <>
                <div className="space-y-2 mb-2">
                  {selectedStore.orders.map((order: any) => (
                    <div key={order._id} onClick={() => toggleSelectOrder(order._id)} className={`border rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${selectedOrders.has(order._id) ? 'bg-red-50 border-red-300' : ''}`}>
                      <div>
                        <p className="font-medium">Order #{order._id}</p>
                        <p className="text-sm text-gray-600">รวม {order.totalPrice} บาท</p>
                      </div>
                      <FaTrash className="text-red-500" />
                    </div>
                  ))}
                </div>
                {selectedOrders.size > 0 && <button onClick={handleDeleteSelectedOrders} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mb-4">ลบ {selectedOrders.size} ออเดอร์ที่เลือก</button>}
              </>
            ) : (
              <p className="text-gray-500">ไม่มีออเดอร์</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
