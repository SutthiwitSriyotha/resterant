'use client';

import { useEffect, useState, useRef } from 'react';
import { FaUserCircle } from 'react-icons/fa';

interface StoreProfile {
  name: string;
  ownerName?: string;
  phone?: string;
  email: string;
  createdAt: string;
  tableInfo?: {
    hasTables: boolean;
    tableCount: string | number;
  };
  profileImage?: string; // base64 หรือ URL
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    hasTables: false,
    tableCount: 0,
    email: '',
    profileImage: '', // base64
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/store/profile');
        if (res.ok) {
          const store = (await res.json()).store;
          setProfile(store);
          setForm({
            name: store.name || '',
            ownerName: store.ownerName || '',
            phone: store.phone || '',
            hasTables: store.tableInfo?.hasTables || false,
            tableCount: Number(store.tableInfo?.tableCount) || 0,
            email: store.email || '',
            profileImage: store.profileImage || '',
          });
        } else if (res.status === 401) {
          setError('กรุณาเข้าสู่ระบบก่อน');
        } else {
          setError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file' && files && files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm({ ...form, profileImage: reader.result as string });
      };
      reader.readAsDataURL(files[0]);
    } else {
      setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/store/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tableCount: Number(form.tableCount) }),
      });
      const data = await res.json();
      if (data.success) {
        setProfile({ ...profile!, ...form, tableInfo: { hasTables: form.hasTables, tableCount: Number(form.tableCount) } });
        setEditMode(false);
        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      } else {
        alert(data.message || 'แก้ไขข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-gray-700 text-lg">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  if (!profile)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-gray-700 text-lg">ไม่พบข้อมูลโปรไฟล์</p>
      </div>
    );

  const fieldClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 border-b pb-2">ข้อมูลโปรไฟล์ร้านค้า</h1>
        <div className="space-y-4">

          {/* รูปโปรไฟล์ */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-40 h-40 rounded-full overflow-hidden border-4 border-indigo-100 shadow-lg mb-3 cursor-pointer"
              onClick={() => {
                if (editMode && fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
            >
              {form.profileImage ? (
                <img src={form.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FaUserCircle className="w-full h-full object-cover text-gray-400" />
              )}
            </div>
            {editMode && (
              <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
                ref={fileInputRef}
              />
            )}
            {editMode && <p className="text-sm text-gray-600">คลิกที่รูปเพื่อเปลี่ยนภาพโปรไฟล์</p>}
          </div>

          {/* ชื่อร้าน */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">ชื่อร้าน</label>
            {editMode ? (
              <input type="text" name="name" value={form.name} onChange={handleChange} className={fieldClass} autoFocus />
            ) : (
              <p className="text-gray-800">{profile.name}</p>
            )}
          </div>

          {/* ชื่อผู้ติดต่อ */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">ชื่อของคุณ</label>
            {editMode ? (
              <input type="text" name="ownerName" value={form.ownerName} onChange={handleChange} className={fieldClass} />
            ) : (
              <p className="text-gray-800">{profile.ownerName || '-'}</p>
            )}
          </div>

          {/* เบอร์โทร */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">เบอร์โทร</label>
            {editMode ? (
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} className={fieldClass} />
            ) : (
              <p className="text-gray-800">{profile.phone || '-'}</p>
            )}
          </div>

          {/* ร้านมีโต๊ะ */}
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <input type="checkbox" name="hasTables" checked={form.hasTables} onChange={handleChange} className="w-4 h-4" />
                <label className="text-gray-700">ร้านมีโต๊ะสำหรับลูกค้านั่ง</label>
              </>
            ) : (
              <p className="text-gray-800">{profile.tableInfo?.hasTables ? `มี ${profile.tableInfo?.tableCount} โต๊ะ` : 'ไม่มีโต๊ะ'}</p>
            )}
          </div>

          {editMode && form.hasTables && (
            <div>
              <label className="block text-gray-700 font-semibold mb-1">จำนวนโต๊ะ</label>
              <input type="number" name="tableCount" min={1} value={form.tableCount} onChange={handleChange} className={fieldClass} />
            </div>
          )}

          {/* อีเมล */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">อีเมล</label>
            <p className="text-gray-700">{profile.email}</p>
          </div>

          {/* วันที่สมัคร */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1">วันที่สมัคร</label>
            <p className="text-gray-700">
              {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* ปุ่ม */}
          <div className="flex flex-wrap gap-3 mt-4">
            {editMode ? (
              <>
                <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex-1 min-w-[120px]">บันทึก</button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    if (profile) setForm({
                      name: profile.name,
                      ownerName: profile.ownerName || '',
                      phone: profile.phone || '',
                      hasTables: profile.tableInfo?.hasTables || false,
                      tableCount: Number(profile.tableInfo?.tableCount) || 0,
                      email: profile.email,
                      profileImage: profile.profileImage || '',
                    });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition flex-1 min-w-[120px]"
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex-1 min-w-[120px]">แก้ไขข้อมูล</button>
            )}

            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                } catch {
                  alert("ออกจากระบบไม่สำเร็จ");
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex-1 min-w-[120px]"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
