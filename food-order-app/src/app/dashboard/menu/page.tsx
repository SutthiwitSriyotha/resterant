'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

interface AddOn {
  id: string;
  name: string;
  price: number;
}

interface MenuItem {
  _id?: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  addOns?: AddOn[];
}

export default function MenuPage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOnsArray, setAddOnsArray] = useState<AddOn[]>([]);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState('');
  const [editAddOnId, setEditAddOnId] = useState<string | null>(null);
  const [storeSuspended, setStoreSuspended] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const res = await axios.get('/api/store/menu/list', { withCredentials: true });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        setMenus(res.data.menus || []);
        setStoreSuspended(res.data.storeSuspended || false);
      } catch (err: any) {
        if (err.response?.status === 401) {
          window.location.href = '/login';
          return;
        }
        toast.error('ไม่สามารถโหลดเมนูได้');
        console.error('Failed to fetch menus:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenus();
  }, []);

  // ตรวจสอบการแก้ไขข้อมูล
  useEffect(() => {
    if (!editId) {
      setIsDirty(false);
      return;
    }
    const currentMenu = menus.find((m) => m._id === editId);
    if (!currentMenu) return;

    const changed =
      name !== currentMenu.name ||
      price !== currentMenu.price.toString() ||
      description !== (currentMenu.description || '') ||
      JSON.stringify(addOnsArray) !== JSON.stringify(currentMenu.addOns || []) ||
      imageFile !== null;

    setIsDirty(changed);
  }, [name, price, description, addOnsArray, imageFile, editId, menus]);

  const handleUpload = async () => {
    if (storeSuspended) {
      toast.error('ร้านถูกระงับ ไม่สามารถแก้ไขหรือเพิ่มเมนูได้');
      return;
    }
    if (!name || !price) {
      toast.error('กรุณากรอกชื่อและราคาของเมนู');
      return;
    }

    setIsSaving(true);
    try {
      if (imageFile) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result as string;
          await saveMenu(base64Image);
        };
        reader.readAsDataURL(imageFile);
      } else {
        await saveMenu();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const saveMenu = async (base64Image?: string) => {
    const menuData: any = {
      name,
      price: parseFloat(price),
      description,
      addOns: addOnsArray,
    };
    if (base64Image) menuData.image = base64Image;

    try {
      if (editId) {
        const res = await axios.put(`/api/store/menu/update?id=${editId}`, menuData, { withCredentials: true });
        if (res.data.success) {
          setMenus((prev) =>
            prev.map((item) =>
              item._id === editId ? { ...item, ...menuData, _id: editId } : item
            )
          );
          toast.success('อัปเดตเมนูเรียบร้อย');
        }
      } else {
        const res = await axios.post('/api/store/menu/save', { menus: [menuData] }, { withCredentials: true });
        if (res.data.success) {
          const newMenu = {
            ...menuData,
            isAvailable: true,
            _id: res.data.insertedIds?.[0] || `${Date.now()}`,
          };
          setMenus((prev) => [...prev, newMenu]);
          toast.success('เพิ่มเมนูเรียบร้อย');
        }
      }
      resetForm();
    } catch (err: any) {
      if (err.response?.status === 403) {
        toast.error('ร้านถูกระงับ ไม่สามารถบันทึกเมนูได้');
        return;
      }
      if (err.response?.status === 401) {
        window.location.href = '/login';
        return;
      }
      toast.error('เกิดข้อผิดพลาดในการบันทึกเมนู');
      console.error('Error saving menu:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDescription('');
    setImageFile(null);
    setEditId(null);
    setAddOnsArray([]);
    setNewAddOnName('');
    setNewAddOnPrice('');
    setEditAddOnId(null);
    setIsDirty(false);
  };

  const handleEdit = (menu: MenuItem) => {
    if (storeSuspended) {
      toast.error('ร้านถูกระงับ ไม่สามารถแก้ไขเมนูได้');
      return;
    }
    setName(menu.name);
    setPrice(menu.price.toString());
    setDescription(menu.description || '');
    setEditId(menu._id || null);
    setAddOnsArray(menu.addOns || []);
    setImageFile(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ลบเมนูแบบ Toaster ยืนยัน
  const handleDelete = (id?: string) => {
    if (storeSuspended) {
      toast.error('ร้านถูกระงับ ไม่สามารถลบเมนูได้');
      return;
    }
    if (!id) return;

     toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <span className=" font-medium">คุณแน่ใจว่าจะลบเมนูนี้หรือไม่?</span>
          <div className="flex gap-2 justify-end mt-2">
            <button
              className="px-3 py-1 bg-gray-400 rounded hover:bg-gray-700 text-white"
              onClick={() => toast.dismiss(t.id)}
            >
              ยกเลิก
            </button>
            <button
              className="px-3 py-1 bg-red-500 rounded hover:bg-red-600 text-white"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/store/menu/delete?id=${id}`, { method: 'DELETE', credentials: 'include' });
                  const data = await res.json();
                  if (data.success) {
                    setMenus((prev) => prev.filter((menu) => menu._id !== id));
                    toast.success('ลบเมนูเรียบร้อย');
                  } else {
                    toast.error(`ลบเมนูไม่สำเร็จ: ${data.message}`);
                  }
                } catch (err) {
                  toast.error('เกิดข้อผิดพลาดในการลบเมนู');
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

  // เพิ่ม / แก้ไข Add-on
  const handleAddAddOn = () => {
    if (!newAddOnName || !newAddOnPrice) {
      toast.error('กรุณากรอกชื่อและราคาของ Add-on');
      return;
    }

    if (editAddOnId) {
      setAddOnsArray((prev) =>
        prev.map((a) =>
          a.id === editAddOnId ? { ...a, name: newAddOnName, price: parseFloat(newAddOnPrice) } : a
        )
      );
      toast.success('อัปเดต Add-on เรียบร้อย');
      setEditAddOnId(null);
    } else {
      setAddOnsArray((prev) => [
        ...prev,
        { id: Date.now().toString(), name: newAddOnName, price: parseFloat(newAddOnPrice) },
      ]);
      toast.success('เพิ่ม Add-on เรียบร้อย');
    }

    setNewAddOnName('');
    setNewAddOnPrice('');
  };

  const handleEditAddOn = (addOn: AddOn) => {
    setNewAddOnName(addOn.name);
    setNewAddOnPrice(addOn.price.toString());
    setEditAddOnId(addOn.id);
  };

  const handleRemoveAddOn = (id: string) => {
    setAddOnsArray((prev) => prev.filter((a) => a.id !== id));
    toast.success('ลบ Add-on เรียบร้อย');
  };

  return (
    <div className="bg-white min-h-screen p-5 md:p-8 max-w-4xl mx-auto text-gray-900">
      {/* Toaster */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            fontSize: '16px',
            padding: '12px 24px',
            borderRadius: '12px',
            textAlign: 'center',
            minWidth: '250px',
          },
          success: { style: { background: '#16a34a' } },
          error: { style: { background: '#dc2626' } },
        }}
      />

      <h1 className="text-3xl font-bold mb-6 text-[#00b14f]">จัดการเมนูอาหาร</h1>

      {storeSuspended && (
        <p className="text-red-600 font-semibold mb-4">
          ร้านถูกระงับ คุณไม่สามารถแก้ไขหรือเพิ่มเมนูได้กรุณาติดต่อผู้ดูแลระบบ
        </p>
      )}

      {/* ฟอร์มจัดการเมนู */}
      <div ref={formRef} className="bg-gray-50 border border-gray-200 rounded-2xl shadow-lg p-6 space-y-5 mb-10">
        {/* ชื่อเมนู */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">ชื่อเมนู</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น ข้าวหมูแดง"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00b14f]"
            disabled={storeSuspended}
          />
        </div>

        {/* ราคา */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">ราคา (บาท)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="เช่น 60"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00b14f]"
            disabled={storeSuspended}
          />
        </div>

        {/* คำอธิบาย */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">คำอธิบาย (ถ้ามี)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายเพิ่มเติมเกี่ยวกับเมนู"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00b14f]"
            disabled={storeSuspended}
          />
        </div>

        {/* Upload รูป */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">อัปโหลดรูป</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full"
            disabled={storeSuspended}
          />
        </div>

        {/* Add-ons */}
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Add-ons</h3>

          {/* ฟอร์มเพิ่ม / อัปเดต Add-on */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="ชื่อ Add-on"
              value={newAddOnName}
              onChange={(e) => setNewAddOnName(e.target.value)}
              className="border px-2 py-1 rounded w-32"
              disabled={storeSuspended}
            />
            <input
              type="number"
              placeholder="ราคา"
              value={newAddOnPrice}
              onChange={(e) => setNewAddOnPrice(e.target.value)}
              className="border px-2 py-1 rounded w-20"
              disabled={storeSuspended}
            />
            <button
              type="button"
              onClick={handleAddAddOn}
              className="bg-[#00b14f] text-white px-3 rounded"
              disabled={storeSuspended}
            >
              {editAddOnId ? 'อัปเดต' : 'เพิ่ม'}
            </button>
          </div>

          {/* แสดงรายการ Add-on */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addOnsArray.map((a) => (
              <div
                key={a.id}
                className="flex justify-between items-center border border-gray-300 bg-white rounded-lg px-3 py-2 shadow-sm"
              >
                <span className="text-sm text-gray-800">
                  {a.name} +{a.price} บาท
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditAddOn(a)}
                    className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                    disabled={storeSuspended}
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddOn(a.id)}
                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200"
                    disabled={storeSuspended}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ปุ่ม */}
        <div className="pt-4 flex gap-4">
          <button
            onClick={handleUpload}
            disabled={isSaving || storeSuspended || (!!editId && !isDirty)}
            className={`bg-[#00b14f] hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition ${
              isSaving || storeSuspended || (!!editId && !isDirty) ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSaving ? 'กำลังบันทึกเมนู...' : editId ? 'อัปเดตเมนู' : 'บันทึกเมนู'}
          </button>

          <button
            onClick={resetForm}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg transition"
            disabled={storeSuspended && !editId}
          >
            ยกเลิก
          </button>
        </div>
      </div>

      {/* รายการเมนู */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isLoading ? (
          <p className="text-center text-gray-500 col-span-full">กำลังโหลดเมนู...</p>
        ) : menus.length === 0 ? (
          <p className="text-center text-gray-500 col-span-full">ตอนนี้ร้านยังไม่ได้เพิ่มเมนู</p>
        ) : (
          menus.map((menu) => (
            <div
              key={menu._id}
              className="border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition p-4 bg-white"
            >
              {menu.image && (
                <Image
                  src={menu.image}
                  alt={menu.name}
                  width={500}
                  height={300}
                  className="rounded-xl object-cover w-full h-48 mb-3"
                />
              )}
              <h2 className="text-lg font-bold text-gray-800">{menu.name}</h2>
              <p className="text-[#00b14f] font-semibold">{menu.price} บาท</p>
              {menu.description && <p className="text-sm text-gray-500 mt-1">{menu.description}</p>}

              <div className="flex flex-wrap gap-2 mt-2">
                {menu.addOns?.map((a) => (
                  <span key={a.id} className="text-sm bg-gray-200 px-2 py-1 rounded">
                    {a.name} +{a.price} บาท
                  </span>
                ))}
              </div>

              <div className="mt-4 flex gap-4 text-sm font-semibold">
                <button
                  onClick={() => handleEdit(menu)}
                  className="text-[#00b14f] hover:underline"
                  disabled={storeSuspended}
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(menu._id)}
                  className="text-red-500 hover:underline"
                  disabled={storeSuspended}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
