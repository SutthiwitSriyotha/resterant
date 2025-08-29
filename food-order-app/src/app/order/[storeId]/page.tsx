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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [addingMenuId, setAddingMenuId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState(1);
  const [addComment, setAddComment] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);

  const [hasTables, setHasTables] = useState(false);
  const [maxTableCount, setMaxTableCount] = useState(0);

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await axios.get(`/api/store/${storeId}/menu/list`);
        setMenus(res.data.menus);
      } catch (error) {
        console.error('โหลดเมนูล้มเหลว', error);
      }
    }

    async function fetchStoreInfo() {
      try {
        const res = await axios.get(`/api/store/${storeId}/info`);
        if (res.data.success && res.data.tableInfo) {
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

  const handleStartAdd = (menuId: string) => {
    const item = orderItems.find((i) => i.menuId === menuId);
    setAddingMenuId(menuId);
    setAddQuantity(item ? item.quantity : 1);
    setAddComment(item ? item.comment : '');
    setSelectedAddOns(item ? item.selectedAddOns || [] : []);
  };

  const handleToggleAddOn = (addon: AddOn) => {
    setSelectedAddOns((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const handleConfirmAdd = () => {
    if (!addingMenuId) return;
    if (addQuantity <= 0) {
      alert('กรุณาใส่จำนวนมากกว่า 0');
      return;
    }
    const menu = menus.find((m) => m._id === addingMenuId);
    if (!menu) return;

    setOrderItems((prev) => {
      const exist = prev.find((item) => item.menuId === addingMenuId);
      if (exist) {
        return prev.map((item) =>
          item.menuId === addingMenuId
            ? { ...item, quantity: addQuantity, comment: addComment, selectedAddOns }
            : item
        );
      } else {
        return [
          ...prev,
          {
            menuId: menu._id,
            name: menu.name,
            price: menu.price,
            quantity: addQuantity,
            comment: addComment,
            selectedAddOns,
          },
        ];
      }
    });

    setAddingMenuId(null);
  };

  const handleRemoveOrderItem = (menuId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.menuId !== menuId));
  };

  const totalPrice = orderItems.reduce((sum, item) => {
    const addonsTotal = item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0;
    return sum + (item.price + addonsTotal) * item.quantity;
  }, 0);

  const handleSubmitOrder = async () => {
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
        setOrderItems([]);
        setTableNumber('');
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
      <h1 className="text-2xl font-extrabold mb-8 select-none">🍽️ สั่งอาหาร</h1>

      {/* เลือกโต๊ะ */}
      <div className="mb-8">
        <label htmlFor="tableNumber" className="block text-base font-semibold mb-2">
          เลือกโต๊ะ
        </label>
        {hasTables ? (
          <select
            id="tableNumber"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-gray-400 px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-300 transition"
          >
            <option value="">-- เลือกโต๊ะ --</option>
            {Array.from({ length: maxTableCount }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                โต๊ะ {num}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            placeholder="ร้านไม่มีโต๊ะพิมพ์ชื่อเล่นได้เลย"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-gray-400 px-4 py-3 text-base shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 transition"
          />
        )}
      </div>

      {/* เมนู */}
      {addingMenuId ? (
        (() => {
          const menu = menus.find((m) => m._id === addingMenuId);
          if (!menu) return null;
          return (
            <div className="max-w-3xl mx-auto p-8 bg-gray-50 rounded-3xl shadow-lg border border-gray-300 flex flex-col items-center space-y-6">
              {menu.image && (
                <img
                  src={menu.image}
                  alt={menu.name}
                  className="w-full max-h-[400px] object-cover rounded-3xl shadow-md"
                />
              )}
              <h2 className="text-2xl font-bold">{menu.name}</h2>
              <p className="text-xl">{menu.price.toLocaleString()} บาท</p>
              {menu.description && (
                <p className="max-w-xl text-center text-gray-700">{menu.description}</p>
              )}

              {menu.addOns && menu.addOns.length > 0 && (
                <div className="w-full max-w-md mt-4 space-y-2">
                  <p className="font-semibold mb-2">Add เพิ่มเติม</p>
                  {menu.addOns.map((addon) => (
                    <label
                      key={addon.id}
                      className="flex items-center gap-3 border border-gray-300 rounded-xl px-4 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddOns.some((a) => a.id === addon.id)}
                        onChange={() => handleToggleAddOn(addon)}
                        className="w-5 h-5"
                      />
                      <span>
                        {addon.name} (+{addon.price} บาท)
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="w-full max-w-md space-y-4 mt-4">
                <div>
                  <label className="block text-lg font-semibold mb-2">จำนวน</label>
                  <input
                    type="number"
                    min={1}
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-400 px-5 py-3 text-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold mb-2">คอมเมนต์</label>
                  <input
                    type="text"
                    value={addComment}
                    onChange={(e) => setAddComment(e.target.value)}
                    placeholder="เช่น เผ็ดน้อย ไม่ใส่ผัก"
                    className="w-full rounded-xl border border-gray-400 px-5 py-3 text-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-300 transition"
                  />
                </div>
              </div>

              <div className="flex gap-8 mt-6">
                <button
                  onClick={handleConfirmAdd}
                  className="bg-green-700 text-white px-10 py-4 rounded-3xl shadow-lg hover:bg-green-800 transition text-lg font-semibold"
                >
                  ยืนยันเพิ่มในออเดอร์
                </button>
                <button
                  onClick={() => setAddingMenuId(null)}
                  className="bg-gray-300 text-gray-700 px-10 py-4 rounded-3xl shadow-lg hover:bg-gray-400 transition text-lg font-semibold"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {menus.map((menu) => {
            const orderItem = orderItems.find((item) => item.menuId === menu._id);
            return (
              <div
                key={menu._id}
                className="border border-gray-300 rounded-3xl p-6 shadow-md bg-gray-50 hover:shadow-lg transition cursor-pointer select-none flex flex-col"
              >
                {menu.image && (
                  <img
                    src={menu.image}
                    alt={menu.name}
                    className="w-full h-48 object-cover rounded-2xl mb-5 shadow-sm"
                  />
                )}
                <h2 className="text-lg font-bold mb-1">{menu.name}</h2>
                <p className="text-base mb-3">{menu.price.toLocaleString()} บาท</p>
                {menu.description && (
                  <p className="text-gray-700 mb-5 line-clamp-3">{menu.description}</p>
                )}
                <button
                  onClick={() => handleStartAdd(menu._id)}
                  className="mt-auto w-full bg-blue-500 text-white py-3 rounded-3xl shadow hover:bg-blue-700 transition text-base font-semibold"
                >
                  {orderItem ? 'แก้ไขในออเดอร์' : 'เพิ่มในออเดอร์'}
                </button>
                {orderItem && (
                  <p className="mt-3 text-green-700 font-semibold text-center">
                    เพิ่มไว้ในออเดอร์: {orderItem.quantity} ชิ้น
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* สรุปออเดอร์ */}
      <section className="mt-12 max-w-4xl mx-auto bg-gray-50 rounded-3xl p-6 shadow-md">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900">รายการอาหารที่เลือก</h2>

        {orderItems.length === 0 ? (
          <p className="text-gray-700 text-base">ยังไม่มีรายการอาหารที่เลือก</p>
        ) : (
          <div className="space-y-4">
            {orderItems.map((item) => {
              const addonsTotal = item.selectedAddOns?.reduce((a, b) => a + b.price, 0) || 0;
              return (
                <div
                  key={item.menuId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{item.name}</p>
                    {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                      <p className="text-gray-600 mt-1">
                        Add-ons:{' '}
                        {item.selectedAddOns.map((a) => `${a.name}(+${a.price})`).join(', ')}
                      </p>
                    )}
                    <p className="text-gray-700 mt-1">
                      จำนวน: <span className="font-semibold">{item.quantity} ชิ้น</span>
                    </p>
                    {item.comment && (
                      <p className="italic text-gray-600 mt-1">คอมเมนต์: {item.comment}</p>
                    )}
                    <p className="mt-1 text-gray-900 font-semibold">
                      รวม: {(item.price + addonsTotal) * item.quantity} บาท
                    </p>
                  </div>

                  <div className="mt-4 sm:mt-0 flex gap-3">
                    <button
                      onClick={() => handleStartAdd(item.menuId)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-600 transition font-medium"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleRemoveOrderItem(item.menuId)}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl shadow hover:bg-red-600 transition font-medium"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-right font-semibold text-lg text-gray-900">
          ราคารวม: {totalPrice.toLocaleString()} บาท
        </div>

        <button
          onClick={handleSubmitOrder}
          className="mt-6 bg-green-600 text-white px-10 py-3 rounded-3xl shadow hover:bg-green-700 transition text-lg font-semibold w-full max-w-md mx-auto block"
        >
          สั่งอาหาร
        </button>
      </section>

      <section className="max-w-md mx-auto mt-7">
        <button
          onClick={() => router.push(`/order/${storeId}/status`)}
          className="w-full bg-blue-500 text-white px-6 py-3 rounded-3xl font-semibold text-lg shadow hover:bg-blue-700 transition"
        >
          เช็คสถานะอาหาร
        </button>
      </section>
    </div>
  );
}
