import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SystemLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/system/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('system_token', data.token);
        sessionStorage.setItem('system_email', data.email);
        navigate('/system/dashboard');
      } else {
        setError(data.error || 'Sai thông tin đăng nhập');
      }
    } catch {
      setError('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] flex items-center justify-center font-outfit relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-400/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-sm px-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-5 py-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">System Portal</span>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.png" alt="MEKIE" className="w-16 h-16 rounded-3xl mx-auto mb-5 shadow-2xl shadow-amber-400/30 bg-white p-1" />
          <h1 className="text-3xl font-light text-white tracking-tight mb-2">Hệ Thống Tổng</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">
            <span className="text-[#4285F4]">M</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC05]">K</span>
            <span className="text-[#4285F4]">I</span>
            <span className="text-[#34A853]">E</span>
            <span className="ml-1 text-zinc-400">SUPER ADMIN</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs mb-6 text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Email</label>
            <input
              required type="email" id="system-email"
              placeholder="superadmin@mekie.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/50 focus:bg-white/8 outline-none transition-all"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Mật khẩu</label>
            <input
              required type="password" id="system-password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-zinc-600 focus:border-amber-400/50 outline-none transition-all"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit" id="system-login-btn"
            disabled={loading}
            className="w-full bg-amber-400 text-black font-black py-4 rounded-2xl hover:bg-amber-300 transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-2 shadow-lg shadow-amber-400/20 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Đang xác thực...
              </span>
            ) : 'Truy cập hệ thống'}
          </button>
        </form>

        <p className="text-center mt-10 text-[10px] text-zinc-700 uppercase tracking-widest">
          Khu vực nội bộ · Chỉ dành cho quản trị viên hệ thống
        </p>
      </div>
    </div>
  );
}
