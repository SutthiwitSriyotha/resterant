'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Cropper from 'react-easy-crop';

type Area = { x: number; y: number; width: number; height: number };


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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);


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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setImageFile(file);
  const url = URL.createObjectURL(file);
  setPreviewUrl(url);
  setShowCropper(true); 
};

const handleEditImage = (menu: MenuItem) => {
  if (!menu.image) return;
  setPreviewUrl(menu.image);  // รูปเดิม
  setShowCropper(true);       // เปิด crop modal
  setImageFile(null);         // ยังไม่ได้เลือกไฟล์ใหม่
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
    <div className="flex flex-col gap-3 w-72"> {/* กำหนดความกว้างคงที่ */}
      <span className="font-medium text-center">คุณแน่ใจว่าจะลบเมนูนี้หรือไม่?</span>
      <div className="flex gap-3 justify-center mt-2"> {/* จัดปุ่มให้อยู่กลาง */}
        <button
          className="px-4 py-1 bg-gray-400 rounded hover:bg-gray-700 text-white min-w-[80px]"
          onClick={() => toast.dismiss(t.id)}
        >
          ยกเลิก
        </button>
        <button
          className="px-4 py-1 bg-red-500 rounded hover:bg-red-600 text-white min-w-[80px]"
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
  {
    duration: 5000, // กำหนดเวลา toast
    style: {
      width: '400px',    
      maxWidth: '350px',
      minWidth: '300px',
      textAlign: 'center',
      padding: '16px',
      borderRadius: '12px',
    },
  }
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

  async function getCroppedImg(imageSrc: string, crop: any): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return canvas.toDataURL("image/jpeg");
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Image can only be created in the browser"));
      return;
    }

    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () =>
      reject(new Error("Failed to load image"))
    );
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}


async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type });
}

const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
  setCroppedAreaPixels(croppedAreaPixels);
};

const handleCropSave = async () => {
  if (!previewUrl || !croppedAreaPixels) return;

  const croppedImage = await getCroppedImg(previewUrl, croppedAreaPixels);

  if (croppedImage) {
    setPreviewUrl(croppedImage); // อัปเดตรูป preview
    // ถ้ามีไฟล์ใหม่ ให้แปลง base64 เป็น File
    const file = await urlToFile(croppedImage, 'menu.jpg');
    setImageFile(file);
  }

  setShowCropper(false); // ปิด modal
};




  return (
  <div className="bg-gray-100 min-h-screen text-gray-900">
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
            width: '400px',        // กำหนดความกว้างเท่ากันทุกอัน
            boxSizing: 'border-box', // ป้องกัน padding ทำให้เกิน
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          },
          success: {
            style: { background: '#16a34a', width: '400px', boxSizing: 'border-box' },
          },
          error: {
            style: { background: '#dc2626', width: '400px', boxSizing: 'border-box' },
          },
        }}
      />

    {/* Navbar */}
    <nav className="w-full bg-green-400 text-black h-16 px-5 shadow-md flex items-center justify-between">
      <h1 className="text-xl font-bold select-none">จัดการเมนูอาหาร</h1>
    </nav>


    {/* การ์ดใหญ่รวมทุกอย่าง */}
    <div className="max-w-4xl mx-auto mt-4 bg-white rounded-2xl shadow-lg p-2 md:p-2 space-y-4">
      
      {/* การ์ดย่อย 1: ฟอร์มเพิ่ม/แก้ไขเมนู */}
      <div className="bg-gray-50 rounded-xl shadow-inner p-4 md:p-6 space-y-5">
        {/* หัวข้อแบบ Dynamic */}
        <h2 className="text-xl font-bold text-gray-800">
          {editId ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหาร'}
        </h2>

        {storeSuspended && (
          <p className="text-red-600 font-semibold">
            ร้านถูกระงับ คุณไม่สามารถแก้ไขหรือเพิ่มเมนูได้กรุณาติดต่อผู้ดูแลระบบ
          </p>
        )}

        {/* ฟอร์มจัดการเมนู */}
        <div ref={formRef} className="space-y-5">
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
            onChange={handleFileChange}   // เรียกฟังก์ชัน handleFileChange
            className="w-full"
            disabled={storeSuspended}
          />
        </div>

        {/* แสดงรูป preview และปุ่มแก้ไข */}
        {previewUrl && (
          <div className="mt-2 flex flex-col items-center gap-2">
            <div className="w-full max-w-sm h-48 bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCropper(true)}  // เปิด modal ครอปรูป
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={storeSuspended}
            >
              แก้ไขรูปเดิม
            </button>
          </div>
        )}




          {/* Add-ons */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Add-ons</h3>

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
      </div>

      {/* Modal Cropper */}
      {showCropper && previewUrl && (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-lg">
          <h2 className="text-lg font-semibold mb-4">ครอปรูป</h2>

          <div className="relative w-full h-48 bg-gray-100">
            <Cropper
              image={previewUrl}       
              crop={crop}              
              zoom={zoom}              
              aspect={500 / 300}       
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={true}          
              restrictPosition={false} 
              cropShape="rect"         
            />
          </div>

          <div className="mt-4">
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => setShowCropper(false)}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleCropSave}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              ยืนยัน
            </button>
          </div>
        </div>
      </div>
    )}


      {/* การ์ดย่อย 2: รายการเมนู */}
      <div className="bg-gray-50 rounded-xl shadow-inner p-4 md:p-6 space-y-2">
        <h2 className="text-lg font-bold text-gray-800">รายการเมนู</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isLoading ? (
            <p className="text-center text-gray-500 col-span-full">กำลังโหลดเมนู...</p>
          ) : menus.length === 0 ? (
            <p className="text-center text-gray-500 col-span-full">ตอนนี้ร้านยังไม่ได้เพิ่มเมนู</p>
          ) : (
            menus.map((menu) => (
              <div
                key={menu._id}
                className="border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition p-2 bg-white"
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
                <h3 className="text-lg font-bold text-gray-800">{menu.name}</h3>
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
    </div>
  </div>
);



}
