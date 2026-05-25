import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Trang đăng ký NHÂN VIÊN — dùng mã mời (access_code) từ chủ shop
// URL: /register — nhân viên truy cập link này và nhập mã do Admin cung cấp
export default function Register() {
  const [formData, setFormData] = useState({
    tenant_id: '',
    access_code: '',
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, register_type: 'staff' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Gia nhập shop thành công! Bạn có thể đăng nhập ngay.');
        navigate('/login');
      } else {
        setError(data.error || 'Đăng ký thất bại');
        toast.error(data.error || 'Đăng ký thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-outfit">

      {/* LEFT — Branding */}
      <div className="hidden lg:flex w-[45%] bg-[#1a1a1a] flex-col justify-between p-16 relative overflow-hidden shrink-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#8FA08A]/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-16 w-80 h-80 rounded-full bg-[#8FA08A]/5 blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <img src="/logo.png" alt="MEKIE" className="w-10 h-10 rounded-xl bg-white shadow-lg p-0.5" />
          <div>
            <div className="text-white font-black text-sm tracking-tight">
              <span className="text-[#4285F4]">M</span>
              <span className="text-[#EA4335]">E</span>
              <span className="text-[#FBBC05]">K</span>
              <span className="text-[#4285F4]">I</span>
              <span className="text-[#34A853]">E</span>
              <span className="text-zinc-400 ml-1 font-medium">POS</span>
            </div>
            <div className="text-zinc-600 text-[9px] uppercase tracking-widest">Cổng Nhân Viên</div>
          </div>
        </div>

        {/* Center */}
        <div className="z-10">
          <div className="inline-flex items-center gap-2 bg-[#8FA08A]/15 border border-[#8FA08A]/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-[#8FA08A] rounded-full animate-pulse" />
            <span className="text-[#8FA08A] text-[10px] font-black uppercase tracking-widest">Nhân viên tự đăng ký</span>
          </div>
          <h2 className="text-4xl font-light text-white tracking-tight leading-tight mb-5">
            Gia nhập<br />
            <em className="text-[#8FA08A]">cùng đội nhóm</em><br />
            của bạn.
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
            Nhập mã Shop và mã mời nhân viên nhận từ chủ cửa hàng. Bạn có thể dùng bất kỳ email cá nhân nào.
          </p>
        </div>

        {/* Bottom tip */}
        <div className="z-10 bg-white/4 rounded-2xl p-6 border border-white/5">
          <p className="text-zinc-500 text-xs leading-relaxed">
            <span className="text-[#8FA08A] font-bold">Lưu ý:</span>{' '}
            Mã mời và Mã Shop do chủ cửa hàng cung cấp. Nếu chưa có, hãy liên hệ trực tiếp chủ shop của bạn.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 bg-[#FBFBF9] flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <img src="/logo.png" alt="MEKIE" className="w-9 h-9 rounded-xl shadow-sm bg-white p-0.5" />
            <div>
              <div className="font-black text-sm tracking-tight">
                <span className="text-[#4285F4]">M</span>
                <span className="text-[#EA4335]">E</span>
                <span className="text-[#FBBC05]">K</span>
                <span className="text-[#4285F4]">I</span>
                <span className="text-[#34A853]">E</span>
                <span className="text-zinc-400 ml-1 font-medium">POS</span>
              </div>
              <div className="text-zinc-400 text-[9px] uppercase tracking-widest">Cổng Nhân Viên</div>
            </div>
          </div>

          <h1 className="text-3xl font-light text-[#333333] tracking-tight mb-1">Gia nhập Shop</h1>
          <p className="text-zinc-400 text-sm mb-8">Nhập mã mời từ chủ cửa hàng của bạn.</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Mã Shop */}
            <div>
              <label htmlFor="staff-tenant-id" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">
                Mã Shop <span className="text-red-400">*</span>
              </label>
              <input
                id="staff-tenant-id"
                required
                type="text"
                placeholder="VD: sunshine-hn"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none transition-colors"
                value={formData.tenant_id}
                onChange={e => setFormData({ ...formData, tenant_id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
              />
              <p className="text-[10px] text-zinc-400 mt-1 ml-0.5">Do chủ shop cung cấp</p>
            </div>

            {/* Mã mời nhân viên */}
            <div>
              <label htmlFor="staff-access-code" className="text-[10px] uppercase tracking-widest text-[#8FA08A] mb-1.5 block font-bold">
                Mã Mời Nhân Viên (Staff Code) <span className="text-red-400">*</span>
              </label>
              <input
                id="staff-access-code"
                required
                type="password"
                placeholder="••••••••"
                className="w-full bg-[#F4F8F4] border border-[#8FA08A]/30 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none transition-colors"
                value={formData.access_code}
                onChange={e => setFormData({ ...formData, access_code: e.target.value })}
              />
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-4">
              {/* Họ tên */}
              <div>
                <label htmlFor="staff-fullname" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">
                  Họ và tên
                </label>
                <input
                  id="staff-fullname"
                  type="text"
                  placeholder="Nguyễn Văn B"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none transition-colors"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="staff-email" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="staff-email"
                  required
                  type="email"
                  placeholder="nhanvien@gmail.com"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none transition-colors"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="staff-password" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">
                  Mật khẩu <span className="text-red-400">*</span>
                </label>
                <input
                  id="staff-password"
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none transition-colors"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              id="staff-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#8FA08A] text-white font-bold py-4 rounded-2xl hover:bg-[#7d8f78] transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-2 shadow-lg shadow-[#8FA08A]/25 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Gia Nhập Shop'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
            <Link to="/login" className="text-xs text-zinc-400 hover:text-[#333333] transition-colors font-medium">
              ← Quay về trang đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
