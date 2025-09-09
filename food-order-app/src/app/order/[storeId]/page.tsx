'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'order' | 'status'>('order');
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

  useEffect(() => {
    const tableFromQuery = searchParams.get('table');
    if (tableFromQuery) setTableNumber(tableFromQuery);
  }, [searchParams]);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await axios.get(`/api/store/${storeId}/menu/list`);
        if (res.data.storeDeleted) {
          setStoreStatus('deleted'); setMenus([]);
        } else if (res.data.storeSuspended) {
          setStoreStatus('suspended'); setMenus([]);
        } else if (res.data.storeTemporaryClosed) {
          setStoreStatus('temporaryClosed'); setMenus([]);
        } else {
          setStoreStatus('active');
          const availableMenus = res.data.menus.filter((menu: any) => menu.isAvailable);
          setMenus(availableMenus);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // ร้านถูกลบ → ไม่ต้อง console.error
          setStoreStatus('deleted');
          setMenus([]);
        } else {
          console.error('โหลดเมนูล้มเหลว', error);
          setStoreStatus('deleted');
          setMenus([]);
        }
      } finally {
        setLoadingMenus(false);
      }
    }

    async function fetchStoreInfo() {
      try {
        const res = await axios.get(`/api/store/${storeId}/info`);
        if (!res.data.success) setStoreStatus('deleted');
        if (res.data.storeSuspended) setStoreStatus('suspended');
        if (res.data.tableInfo) {
          setHasTables(res.data.tableInfo.hasTables);
          setMaxTableCount(res.data.tableInfo.tableCount || 0);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          // ร้านถูกลบ → ไม่ต้อง console.error
          setStoreStatus('deleted');
        } else {
          console.error('โหลดข้อมูลร้านล้มเหลว', error);
        }
      }
    }

    fetchMenus();
    fetchStoreInfo();
  }, [storeId]);

  useEffect(() => {
    async function fetchTakenTables() {
      if (!hasTables) return;
      try {
        const res = await axios.get(`/api/store/${storeId}/orders/active-tables`);
        if (res.data.success) setTakenTables(res.data.takenTables.map(Number));
      } catch (err) {
        console.error('โหลดโต๊ะที่ไม่ว่างล้มเหลว', err);
      }
    }
    fetchTakenTables();
  }, [storeId, hasTables]);

  const handleStartAdd = (menuId: string, index?: number, fromPopup = false) => {
    if (storeStatus !== 'active') return;
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
    if (addQuantity <= 0) { alert('กรุณาใส่จำนวนมากกว่า 0'); return; }
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
      } else return [...prev, newItem];
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
    if (storeStatus !== 'active') { alert('ร้านนี้ไม่สามารถสั่งอาหารได้'); return; }
    const identifier = tableNumber.trim();
    if (!identifier) { alert('กรุณาเลือกหรือกรอกเลขที่โต๊ะ / ชื่อเล่น'); return; }
    if (orderItems.length === 0) { alert('กรุณาเลือกเมนูอย่างน้อย 1 รายการ'); return; }

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
      if (res.data.success) alert('สั่งอาหารเรียบร้อยแล้ว');
      else alert('เกิดข้อผิดพลาดในการสั่งอาหาร');
      window.location.reload();
    } catch (error) { console.error(error); alert('เกิดข้อผิดพลาดในการสั่งอาหาร'); }
  };

  useEffect(() => {
  const tableFromQuery = searchParams.get('table');
  if (tableFromQuery) {
    const tableNum = Number(tableFromQuery);

    if (hasTables && maxTableCount > 0 && (tableNum < 1 || tableNum > maxTableCount)) {
      alert(`ร้านนี้มีแค่ ${maxTableCount} โต๊ะ`);
      setTableNumber(''); 
      router.replace(`/order/${storeId}`); 
      return;
    }

    setTableNumber(tableFromQuery); // ตั้งโต๊ะอัตโนมัติจาก query
  }
}, [searchParams, hasTables, maxTableCount, storeId, router]);

  return (
  <div className="min-h-screen bg-gray-100 text-black font-sans">
    {/* Navbar */}
    <nav className="bg-green-400 text-black p-4 shadow-md flex items-center justify-between">
      <h1 className="text-xl font-bold select-none">รายการสั่งอาหาร</h1>
      <div className="flex gap-3">
        <button
          className={`px-4 py-2 rounded-2xl font-semibold ${
            activeTab === 'status'
              ? 'bg-white text-black'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => router.push(`/order/${storeId}/status`)}
        >
          เช็คสถานะอาหาร
        </button>
      </div>
    </nav>

    {/* รถเข็น */}
    <div className="fixed top-1/3 right-2 transform -translate-y-1/3 z-50">
      <button
        onClick={() => setShowOrderPopup(true)}
        className="bg-green-300 text-white p-2.5 rounded-full shadow-lg hover:bg-green-400 transition relative text-lg"
      >
        🛒
        {orderItems.length > 0 && (
          <span className="absolute -top-0.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md">
            {orderItems.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </button>
    </div>

    {/* Main Content การ์ดใหญ่ */}
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-md p-2 flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          {activeTab === 'order' && (
            <>
              {storeStatus === 'active' && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* เลือกโต๊ะ */}
                  <div className="flex-1 max-w p-4 sm:p-5 bg-gray-50 rounded-2xl shadow-md border border-gray-200">
                    {tableNumber ? (
                      <p className="text-sm sm:text-base font-semibold text-gray-900 text-center sm:text-center">
                        โต๊ะที่นั่งของคุณคือ: โต๊ะ {tableNumber}
                      </p>
                    ) : (
                      <>
                        <label
                          htmlFor="tableNumber"
                          className="block text-sm sm:text-base font-semibold mb-2 text-gray-900 text-center sm:text-left"
                        >
                          เลือกโต๊ะที่นั่งของคุณ
                        </label>
                        {hasTables ? (
                          <select
                            id="tableNumber"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className="w-full rounded-md border border-gray-300 
                                      px-2 py-1.5 sm:px-3 sm:py-2 
                                      text-sm sm:text-base 
                                      text-black shadow-sm 
                                      focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                          >
                            <option value="">
                              เลือกโต๊ะที่นั่งของคุณได้เลย
                            </option>
                            {Array.from({ length: maxTableCount }, (_, i) => i + 1)
                              .filter((num) => !takenTables.includes(num))
                              .map((num) => (
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
                            className="w-full rounded-md border border-gray-300 
                                      px-2 py-1.5 sm:px-3 sm:py-2 
                                      text-sm sm:text-base 
                                      text-black shadow-sm 
                                      placeholder-gray-400 
                                      focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* แสดงสถานะร้าน */}
              {storeStatus !== 'active' && (
                <div
                  className={`text-center text-lg font-bold py-10 ${
                    storeStatus === 'suspended'
                      ? 'text-yellow-600'
                      : storeStatus === 'temporaryClosed'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {storeStatus === 'suspended' &&
                    'ร้านนี้ถูกระงับอยู่ ไม่สามารถสั่งอาหารได้ชั่วคราว'}
                  {storeStatus === 'temporaryClosed' &&
                    'ตอนนี้ร้านยังไม่เปิด ขออภัยด้วย'}
                  {storeStatus === 'deleted' &&
                    'ร้านนี้ไม่สามารถเข้าถึงได้ (ไม่มีร้านนี้)'}
                </div>
              )}

              {/* แสดงเมนู */}
              {storeStatus === 'active' && (
                <>
                  {addingMenuId ? (
                    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-md border border-gray-200">
                      {/* รายละเอียดเมนูเหมือนเดิม */}
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
                              <p className="text-sm text-gray-600 mb-3">
                                {menu.description}
                              </p>
                            )}

                            {menu.addOns && menu.addOns.length > 0 && (
                              <div className="w-full space-y-2 mb-3">
                                <p className="font-semibold text-sm">Add เพิ่มเติม</p>
                                {menu.addOns.map((addon) => {
                                  const isSelected = selectedAddOns.some(
                                    (a) => a.id === addon.id
                                  );
                                  return (
                                    <div
                                      key={addon.id}
                                      onClick={() => handleToggleAddOn(addon)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition
                                        ${
                                          isSelected
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}
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
                                <label className="block text-sm font-semibold mb-1">
                                  จำนวน
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={addQuantity}
                                  onChange={(e) =>
                                    setAddQuantity(Number(e.target.value))
                                  }
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-semibold mb-1">
                                  คอมเมนต์
                                </label>
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
                  ) : menus.filter((menu) => menu.isAvailable).length === 0 ? (
                    <div className="text-center text-gray-500 text-sm sm:text-base py-10">
                      ร้านนี้ยังไม่มีเมนู
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                      {menus
                        .filter((menu) => menu.isAvailable)
                        .map((menu) => (
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
                                <h2 className="text-sm sm:text-base font-bold mb-0.5 truncate">
                                  {menu.name}
                                </h2>
                                <p className="text-xs sm:text-sm mb-1">
                                  {menu.price.toLocaleString()} บาท
                                </p>
                                {menu.description && (
                                  <p className="text-gray-700 text-xs sm:text-sm line-clamp-2">
                                    {menu.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartAdd(menu._id);
                                }}
                                className="mt-2 w-full bg-green-600 text-white py-1.5 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm shadow hover:bg-green-700 transition"
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
            </>
          )}

          {/* Pop-up สรุปออเดอร์ */}
          {showOrderPopup && storeStatus === 'active' && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-5">
              <div className="bg-green-50 rounded-xl p-6 w-full sm:w-96 md:w-[500px] max-h-[90vh] overflow-y-auto shadow-lg relative">
                <button
                  onClick={() => setShowOrderPopup(false)}
                  className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 font-bold text-lg"
                >
                  ✕
                </button>
                <h2 className="text-xl sm:text-xl font-semibold mb-3 text-gray-900">
                  รายการอาหารที่คุณเลือกไว้
                </h2>

                {orderItems.length === 0 ? (
                  <p className="text-gray-700 text-sm sm:text-base">
                    ยังไม่มีรายการอาหารที่เลือก
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item, index) => {
                      const addonsTotal =
                        item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0;
                      return (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition"
                        >
                          <div className="flex-1">
                            <p className="text-sm sm:text-base font-semibold text-gray-900">
                              {item.name}
                            </p>
                            {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                              <p className="text-gray-600 mt-1 text-xs sm:text-sm">
                                Add เพิ่มเติม:{' '}
                                {item.selectedAddOns
                                  .map((a) => `${a.name}(+${a.price})`)
                                  .join(', ')}
                              </p>
                            )}
                            <p className="text-gray-700 mt-1 text-xs sm:text-sm">
                              จำนวน:{' '}
                              <span className="font-semibold">{item.quantity} ชิ้น</span>
                            </p>
                            {item.comment && (
                              <p className="italic text-gray-600 mt-1 text-xs sm:text-sm">
                                คอมเมนต์: {item.comment}
                              </p>
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
      </div>
    </div>
  </div>
);

}
