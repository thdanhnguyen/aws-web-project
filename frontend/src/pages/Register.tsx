import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Trang này là "Hệ thống tổng" — chỉ dùng để tạo Shop Admin mới
// URL: /register (không hiển thị trên giao diện user thông thường)
export default function Register() {
  const [formData, setFormData] = useState({
    tenant_id: '',
    tenant_name: '',
    email: '',
    password: '',
    access_code: '',
    full_name: '',
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
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Khởi tạo shop & tài khoản Admin thành công!');
        navigate('/login');
      } else {
        setError(data.error || 'Tạo shop thất bại');
        toast.error(data.error || 'Tạo shop thất bại');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-outfit">

      {/* LEFT — System Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#1a1a1a] flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#8FA08A]/10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-amber-400/5"></div>

        {/* Header */}
        <div className="flex items-center gap-3 z-10">
          <img src="/logo.png" alt="MEKIE" className="w-10 h-10 rounded-xl bg-white shadow-lg p-0.5" />
          <div>
            <div className="text-white font-black text-sm">MEKIE System</div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-widest">Super Admin Portal</div>
          </div>
        </div>

        {/* Center */}
        <div className="z-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Hệ thống nội bộ</span>
          </div>
          <h2 className="text-4xl font-light text-white tracking-tight leading-tight mb-4">
            Tạo Shop mới<br />
            <em className="text-amber-400">cho khách hàng.</em>
          </h2>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
            Mỗi shop có 1 Admin riêng. Admin sẽ tự quản lý nhân viên, sản phẩm và ca làm từ dashboard của họ.
          </p>
        </div>

        {/* Bottom note */}
        <div className="z-10 bg-white/5 rounded-2xl p-6 border border-white/5">
          <p className="text-zinc-400 text-xs leading-relaxed">
            <span className="text-amber-400 font-bold">Lưu ý:</span> Sau khi tạo, Admin shop sẽ đăng nhập tại trang{' '}
            <span className="text-white font-bold">/login</span> và tự tạo tài khoản nhân viên (Staff) từ dashboard.
          </p>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex-1 bg-[#FBFBF9] flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Mobile header */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <img src="/logo.png" alt="MEKIE" className="w-9 h-9 rounded-xl shadow-sm bg-white p-0.5" />
            <div>
              <div className="font-black text-sm tracking-tight">
                <span className="text-[#4285F4]">M</span>
                <span className="text-[#EA4335]">E</span>
                <span className="text-[#FBBC05]">K</span>
                <span className="text-[#4285F4]">I</span>
                <span className="text-[#34A853]">E</span>
                <span className="text-zinc-500 ml-1 font-medium tracking-normal">SYSTEM</span>
              </div>
              <div className="text-zinc-400 text-[10px] uppercase tracking-widest">Super Admin Portal</div>
            </div>
          </div>

          <h1 className="text-3xl font-light text-[#333333] tracking-tight mb-1">Tạo Shop mới</h1>
          <p className="text-zinc-400 text-sm mb-8">Khởi tạo tenant + tài khoản Admin.</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">Mã Shop (ID)</label>
                <input
                  required type="text" placeholder="sunshine-hn"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none"
                  value={formData.tenant_id}
                  onChange={e => setFormData({ ...formData, tenant_id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">Tên Shop</label>
                <input
                  required type="text" placeholder="Sunshine HN"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none"
                  value={formData.tenant_name}
                  onChange={e => setFormData({ ...formData, tenant_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">Tên Admin</label>
              <input
                type="text" placeholder="Nguyễn Văn A"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">Email Admin</label>
              <input
                required type="email" placeholder="admin@sunshine.com"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-1.5 block font-bold">Mật khẩu Admin</label>
              <input
                required type="password" placeholder="••••••••"
                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-amber-600 mb-1.5 block font-bold">Mã bảo mật shop (Access Code)</label>
              <input
                required type="password" placeholder="Dùng để Admin mời Staff sau này"
                className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm focus:border-amber-400 outline-none"
                value={formData.access_code}
                onChange={e => setFormData({ ...formData, access_code: e.target.value })}
              />
              <p className="text-[10px] text-zinc-400 mt-1 ml-1">Admin sẽ dùng mã này để mời nhân viên gia nhập.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#333333] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-2 shadow-lg shadow-black/10 disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Khởi Tạo Shop'}
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
