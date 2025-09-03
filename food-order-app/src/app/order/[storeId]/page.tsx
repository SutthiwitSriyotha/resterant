'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  addOns?: AddOn[];
  isAvailable?: boolean;
}

interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
  comment: string;
  selectedAddOns?: AddOn[];
}

export default function OrderPage() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [addingMenuId, setAddingMenuId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addComment, setAddComment] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [hasTables, setHasTables] = useState(false);
  const [maxTableCount, setMaxTableCount] = useState(0);
  const [showOrderPopup, setShowOrderPopup] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [takenTables, setTakenTables] = useState<number[]>([]);
  const [storeStatus, setStoreStatus] = useState<'active' | 'suspended' | 'deleted' | 'temporaryClosed'>('active');

  

  // โหลดเมนูและสถานะร้าน
  useEffect(() => {
  async function fetchMenus() {
    try {
      const res = await axios.get(`/api/store/${storeId}/menu/list`);
      if (res.data.storeDeleted) {
        setStoreStatus('deleted');
        setMenus([]);
      } else if (res.data.storeSuspended) {
        setStoreStatus('suspended');
        setMenus([]);
      } else if (res.data.storeTemporaryClosed) {
        setStoreStatus('temporaryClosed');
        setMenus([]);
      } else {
        setStoreStatus('active');
        const availableMenus = res.data.menus.filter((menu: any) => menu.isAvailable);
        setMenus(availableMenus);
      }


    } catch (error) {
      console.error('โหลดเมนูล้มเหลว', error);
      setStoreStatus('deleted');
      setMenus([]);
    } finally {
      setLoadingMenus(false);
    }
  }

  async function fetchStoreInfo() {
    try {
      const res = await axios.get(`/api/store/${storeId}/info`);
      if (!res.data.success) {
        setStoreStatus('deleted');
        return;
      }
      if (res.data.storeSuspended) {
        setStoreStatus('suspended');
      }
      if (res.data.tableInfo) {
        setHasTables(res.data.tableInfo.hasTables);
        setMaxTableCount(res.data.tableInfo.tableCount || 0);
      }
    } catch (error) {
      console.error('โหลดข้อมูลร้านล้มเหลว', error);
    }
  }

  fetchMenus();
  fetchStoreInfo();
}, [storeId]);


  // โหลดโต๊ะที่ถูกจอง
  useEffect(() => {
    async function fetchTakenTables() {
      if (!hasTables) return;
      try {
        const res = await axios.get(`/api/store/${storeId}/orders/active-tables`);
        if (res.data.success) {
          setTakenTables(res.data.takenTables.map(Number));
        }
      } catch (err) {
        console.error('โหลดโต๊ะที่ไม่ว่างล้มเหลว', err);
      }
    }
    fetchTakenTables();
  }, [storeId, hasTables]);

  // ฟังก์ชันจัดการเมนู
  const handleStartAdd = (menuId: string, index?: number, fromPopup = false) => {
    if (storeStatus !== 'active') return; // ถ้าร้านไม่ active ไม่ให้เพิ่ม
    const menu = menus.find((m) => m._id === menuId);
    if (!menu) return;

    if (index !== undefined) {
      const item = orderItems[index];
      setEditingIndex(index);
      setAddingMenuId(menuId);
      setAddQuantity(item.quantity);
      setAddComment(item.comment);
      setSelectedAddOns(item.selectedAddOns || []);
    } else {
      setEditingIndex(null);
      setAddingMenuId(menuId);
      setAddQuantity(1);
      setAddComment('');
      setSelectedAddOns([]);
    }

    if (fromPopup) setShowOrderPopup(false);
  };

  const handleToggleAddOn = (addon: AddOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleConfirmAdd = () => {
    if (!addingMenuId || storeStatus !== 'active') return;
    if (addQuantity <= 0) {
      alert('กรุณาใส่จำนวนมากกว่า 0');
      return;
    }
    const menu = menus.find((m) => m._id === addingMenuId);
    if (!menu) return;

    const newItem: OrderItem = {
      menuId: menu._id,
      name: menu.name,
      price: menu.price,
      quantity: addQuantity,
      comment: addComment,
      selectedAddOns,
    };

    setOrderItems((prev) => {
      if (editingIndex !== null) {
        const copy = [...prev];
        copy[editingIndex] = newItem;
        return copy;
      } else {
        return [...prev, newItem];
      }
    });

    setAddingMenuId(null);
    setEditingIndex(null);
  };

  const handleRemoveOrderItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPrice = orderItems.reduce((sum, item) => {
    const addonsTotal = item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0;
    return sum + (item.price + addonsTotal) * item.quantity;
  }, 0);

  const handleSubmitOrder = async () => {
    if (storeStatus !== 'active') {
      alert('ร้านนี้ไม่สามารถสั่งอาหารได้');
      return;
    }
    const identifier = tableNumber.trim();
    if (!identifier) {
      alert('กรุณาเลือกหรือกรอกเลขที่โต๊ะ / ชื่อเล่น');
      return;
    }
    if (orderItems.length === 0) {
      alert('กรุณาเลือกเมนูอย่างน้อย 1 รายการ');
      return;
    }

    try {
      const orderData = {
        identifier,
        items: orderItems.map((item) => ({
          menuId: item.menuId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          comment: item.comment,
          addOns: item.selectedAddOns || [],
          subtotal:
            (item.price + (item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0)) *
            item.quantity,
        })),
        totalPrice,
        storeId,
      };

      const res = await axios.post('/api/order/create', orderData);

      if (res.data.success) {
        alert('สั่งอาหารเรียบร้อยแล้ว');
        window.location.reload();
      } else {
        alert('เกิดข้อผิดพลาดในการสั่งอาหาร');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการสั่งอาหาร');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white min-h-screen text-black font-sans">
      <h1 className="text-2xl font-extrabold mb-8 select-none">รายการสั่งอาหาร</h1>

      {/* เลือกโต๊ะ + ปุ่มเช็คสถานะ + ดูออเดอร์ */}
      {storeStatus === 'active' && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between max-w-5xl mx-auto gap-4">
          <div className="flex-1 max-w-md p-5 bg-gray-50 rounded-2xl shadow-md border border-gray-200">
            <label htmlFor="tableNumber" className="block text-base font-semibold mb-2 text-gray-900">
              เลือกโต๊ะที่นั่งของท่าน
            </label>
            {hasTables ? (
              <select
                id="tableNumber"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="">เลือกโต๊ะที่นั่งของท่านได้เลย</option>
                {Array.from({ length: maxTableCount }, (_, i) => i + 1)
                  .filter(num => !takenTables.includes(num))
                  .map(num => (
                    <option key={num} value={num}>
                      โต๊ะ {num}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ทางร้านไม่มีโต๊ะ พิมพ์ชื่อเล่นได้เลย"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-base text-black shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            )}
          </div>

          <div className="flex gap-2 relative">
            <button
              onClick={() => router.push(`/order/${storeId}/status`)}
              className="bg-pink-500 text-white px-4 py-2 rounded-3xl font-semibold text-base shadow hover:bg-pink-700 transition"
            >
              เช็คสถานะอาหาร
            </button>

            <div className="relative">
              <button
                onClick={() => setShowOrderPopup(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-3xl font-semibold text-base shadow hover:bg-blue-700 transition"
              >
                ออเดอร์ที่คุณเพิ่มไว้
              </button>
              {orderItems.length > 0 && (
                <span className="absolute -top-2 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                  {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* แสดงสถานะร้าน */}
      {storeStatus === 'suspended' && (
        <div className="text-center text-yellow-600 text-lg font-bold py-10">
          ร้านนี้ถูกระงับอยู่ ไม่สามารถสั่งอาหารได้ชั่วคราว
        </div>
      )}

      {storeStatus === 'temporaryClosed' && (
        <div className="text-center text-yellow-600 text-lg font-bold py-10">
          ตอนนี้ร้านยังไม่เปิด ขออภัยด้วย
        </div>
      )}

      {storeStatus === 'deleted' && (
        <div className="text-center text-red-600 text-lg font-bold py-10">
          ร้านนี้ไม่สามารถเข้าถึงได้ (ไม่มีร้านนี้)
        </div>
      )}


      {/* เมนูรายการอาหาร */}
      {storeStatus === 'active' && (
        <>
          {addingMenuId ? (
            /* แสดง popup เพิ่มเมนู */
            /* ... (โค้ดส่วน popup เพิ่มเมนูเหมือนเดิม) ... */
            <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-200">
              {(() => {
                const menu = menus.find((m) => m._id === addingMenuId);
                if (!menu) return null;
                return (
                  <>
                    {menu.image && (
                      <img
                        src={menu.image}
                        alt={menu.name}
                        className="w-full max-h-[250px] object-cover rounded-xl shadow-sm mb-3"
                      />
                    )}

                    <h2 className="text-xl font-bold mb-1">{menu.name}</h2>
                    <p className="text-base text-gray-700 mb-2">
                      เริ่มต้นที่ {menu.price.toLocaleString()} บาท
                    </p>

                    {menu.description && (
                      <p className="text-sm text-gray-600 mb-3">{menu.description}</p>
                    )}

                    {menu.addOns && menu.addOns.length > 0 && (
                      <div className="w-full space-y-2 mb-3">
                        <p className="font-semibold text-sm">Add เพิ่มเติม</p>
                        {menu.addOns.map((addon) => {
                          const isSelected = selectedAddOns.some((a) => a.id === addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => handleToggleAddOn(addon)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition
                                ${isSelected ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="w-4 h-4 accent-green-600"
                              />
                              <span className="text-sm">
                                {addon.name} (+{addon.price} บาท)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1">จำนวน</label>
                        <input
                          type="number"
                          min={1}
                          value={addQuantity}
                          onChange={(e) => setAddQuantity(Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">คอมเมนต์</label>
                        <input
                          type="text"
                          value={addComment}
                          onChange={(e) => setAddComment(e.target.value)}
                          placeholder="เช่น เผ็ดน้อย ไม่ใส่ผัก"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={handleConfirmAdd}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl shadow-md hover:bg-green-700 transition text-sm font-semibold"
                      >
                        ยืนยัน
                      </button>
                      <button
                        onClick={() => {
                          setAddingMenuId(null);
                          setEditingIndex(null);
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl shadow-md hover:bg-gray-300 transition text-sm font-semibold"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : loadingMenus ? (
            <div className="text-center text-gray-500 text-sm sm:text-base py-10">
              กำลังโหลดเมนู...
            </div>
          ) : menus.filter(menu => menu.isAvailable).length === 0 ? (
            <div className="text-center text-gray-500 text-sm sm:text-base py-10">
              ร้านนี้ยังไม่มีเมนู
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {menus.filter(menu => menu.isAvailable).map((menu) => (
                <div
                  key={menu._id}
                  onClick={() => handleStartAdd(menu._id)}
                  className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition cursor-pointer overflow-hidden"
                >
                  {menu.image && (
                    <div className="w-full aspect-[3/2] p-1 sm:p-2">
                      <img
                        src={menu.image}
                        alt={menu.name}
                        className="w-full h-full object-cover rounded-xl shadow-sm"
                      />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between p-2 sm:p-3">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold mb-0.5 truncate">{menu.name}</h2>
                      <p className="text-xs sm:text-sm mb-1">{menu.price.toLocaleString()} บาท</p>
                      {menu.description && (
                        <p className="text-gray-700 text-xs sm:text-sm line-clamp-2">{menu.description}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartAdd(menu._id); }}
                      className="mt-2 w-full bg-blue-500 text-white py-1.5 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm shadow hover:bg-blue-600 transition"
                    >
                      เพิ่มในออเดอร์
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </>
      )}

      {/* Pop-up สรุปออเดอร์ */}
      {showOrderPopup && storeStatus === 'active' && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-5">
          <div className="bg-gray-50 rounded-2xl p-6 w-full sm:w-96 md:w-[500px] max-h-[90vh] overflow-y-auto shadow-lg relative">
            <button
              onClick={() => setShowOrderPopup(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 font-bold text-lg"
            >
              ✕
            </button>
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-gray-900">รายการอาหารที่เลือก</h2>

            {orderItems.length === 0 ? (
              <p className="text-gray-700 text-sm sm:text-base">ยังไม่มีรายการอาหารที่เลือก</p>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item, index) => {
                  const addonsTotal = item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0;
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
                    >
                      <div className="flex-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-900">{item.name}</p>
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                            Add เพิ่มเติม: {item.selectedAddOns.map((a) => `${a.name}(+${a.price})`).join(', ')}
                          </p>
                        )}
                        <p className="text-gray-700 mt-1 text-xs sm:text-sm">
                          จำนวน: <span className="font-semibold">{item.quantity} ชิ้น</span>
                        </p>
                        {item.comment && (
                          <p className="italic text-gray-600 mt-1 text-xs sm:text-sm">คอมเมนต์: {item.comment}</p>
                        )}
                        <p className="mt-1 text-gray-900 font-semibold text-sm sm:text-base">
                          รวม: {(item.price + addonsTotal) * item.quantity} บาท
                        </p>
                      </div>
                      <div className="flex gap-2 mt-1 sm:mt-0">
                        <button
                          onClick={() => handleStartAdd(item.menuId, index, true)}
                          className="bg-yellow-400 px-2 py-1 rounded-2xl text-white font-semibold hover:bg-yellow-500 transition"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleRemoveOrderItem(index)}
                          className="bg-red-500 px-4 py-2 rounded-2xl text-white font-semibold hover:bg-red-600 transition"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 text-right font-semibold text-sm sm:text-base text-gray-900">
              ราคารวม: {totalPrice.toLocaleString()} บาท
            </div>
            <button
              onClick={handleSubmitOrder}
              className="mt-4 bg-green-600 text-white px-6 py-3 rounded-2xl shadow hover:bg-green-700 transition text-base sm:text-lg font-semibold w-full"
            >
              สั่งอาหาร
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
