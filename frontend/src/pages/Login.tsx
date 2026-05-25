import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('pos_user', JSON.stringify(data.user));
        navigate('/pos');
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
    <div className="min-h-screen w-full flex font-outfit">

      {/* LEFT — Branding Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#333333] flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#8FA08A]/10"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#8FA08A]/20"></div>
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full bg-white/5 translate-x-1/2 -translate-y-1/2"></div>

        <div className="flex items-center gap-4 z-10">
          <img src="/logo.png" alt="MEKIE" className="w-12 h-12 rounded-2xl shadow-lg shadow-black/10" />
          <span className="font-black text-xl tracking-tight text-white">
            MEKIE<span className="text-[#8FA08A] ml-1 font-medium tracking-normal">POS</span>
          </span>
        </div>

        {/* Center content */}
        <div className="z-10">
          <h2 className="text-5xl font-light text-white tracking-tight leading-tight mb-6">
            Quản lý cửa hàng<br />
            <em className="text-[#8FA08A]">thông minh hơn.</em>
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
            Hệ thống POS đa người dùng, phân quyền Admin / Nhân viên, theo dõi ca làm và doanh thu theo thời gian thực.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="flex gap-10 z-10">
          {[['Multi-tenant', 'Mỗi shop độc lập'], ['Real-time', 'Doanh thu tức thì'], ['Ca làm', 'Quản lý nhân viên']].map(([title, desc]) => (
            <div key={title}>
              <div className="text-white font-black text-sm mb-1">{title}</div>
              <div className="text-zinc-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="flex-1 bg-[#FBFBF9] flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">

          <div className="flex lg:hidden items-center gap-3 mb-12">
            <img src="/logo.png" alt="MEKIE" className="w-10 h-10 rounded-xl shadow-sm" />
            <span className="font-black tracking-tight text-lg text-[#333333]">
              MEKIE<span className="text-[#8FA08A] ml-1 font-medium tracking-normal">POS</span>
            </span>
          </div>

          <h1 className="text-3xl font-light text-[#333333] tracking-tight mb-2">Đăng nhập</h1>
          <p className="text-zinc-400 text-sm mb-10">Nhập thông tin tài khoản nhân viên hoặc admin của bạn.</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Email</label>
              <input
                required
                type="email"
                id="login-email"
                placeholder="nhanvien@shop.com"
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-[#333333] focus:border-[#8FA08A] focus:shadow-[0_0_0_3px_rgba(143,160,138,0.15)] transition-all outline-none"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Mật khẩu</label>
              <input
                required
                type="password"
                id="login-password"
                placeholder="••••••••"
                className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm text-[#333333] focus:border-[#8FA08A] focus:shadow-[0_0_0_3px_rgba(143,160,138,0.15)] transition-all outline-none"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full bg-[#333333] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-2 shadow-lg shadow-black/10 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Đang xác thực...
                </span>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-between">
            <p className="text-xs text-zinc-400">Chưa có tài khoản?</p>
            <Link
              to="/register"
              id="go-to-register"
              className="text-xs font-bold text-[#8FA08A] hover:text-[#4A5D45] transition-colors tracking-wide"
            >
              Gia nhập Shop →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
