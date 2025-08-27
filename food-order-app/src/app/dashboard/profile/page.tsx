'use client';

import { useEffect, useState } from 'react';

interface StoreProfile {
  name: string;
  email: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/store/profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data.store);
          setNewName(data.store.name);
        } else if (res.status === 401) {
          setError('กรุณาเข้าสู่ระบบก่อน');
        } else {
          setError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
        }
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!newName.trim()) {
      alert('กรุณากรอกชื่อร้าน');
      return;
    }

    try {
      const res = await fetch('/api/store/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, name: newName.trim() } : prev));
        setEditMode(false);
      } else {
        alert(data.message || 'แก้ไขชื่อร้านไม่สำเร็จ');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการแก้ไขชื่อร้าน');
      console.error(error);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-10">
        <h1 className="text-3xl font-extrabold mb-8 text-gray-900 border-b pb-4">
          ข้อมูลโปรไฟล์ร้านค้า
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">ชื่อร้าน</label>
            {editMode ? (
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                autoFocus
              />
            ) : (
              <p className="text-lg text-gray-800">{profile.name}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">อีเมล</label>
            <p className="text-gray-700">{profile.email}</p>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">วันที่สมัคร</label>
            <p className="text-gray-700">
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 mt-8">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-green-700 transition font-semibold flex-1 min-w-[120px]"
                >
                  บันทึก
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setNewName(profile.name);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg shadow-md hover:bg-gray-400 transition font-semibold flex-1 min-w-[120px]"
                >
                  ยกเลิก
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition font-semibold flex-1 min-w-[120px]"
              >
                แก้ไขข้อมูล
              </button>
            )}

            <button
              className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-red-700 transition font-semibold flex-1 min-w-[120px]"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                } catch (err) {
                  console.error("Logout error", err);
                  alert("ออกจากระบบไม่สำเร็จ");
                }
              }}
            >
              ออกจากระบบ
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
