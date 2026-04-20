import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function Register() {
  const [isJoining, setIsJoining] = useState(false); // [NEW] Chế độ Gia nhập shop
  const [formData, setFormData] = useState({
    tenant_id: '',
    tenant_name: '',
    email: '',
    password: '',
    access_code: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(isJoining ? 'Gia nhập shop thành công!' : 'Khởi tạo shop thành công!');
        navigate('/login');
      } else {
        setError(data.error || 'Đăng ký thất bại');
        toast.error(data.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBF9] flex items-center justify-center p-4 font-outfit relative">
      <Link to="/" className="absolute top-8 left-8 lg:top-12 lg:left-12 text-zinc-400 hover:text-[#333333] transition-colors text-xs font-black tracking-widest uppercase flex items-center gap-2">
        <span className="text-lg">←</span> Trang chủ
      </Link>
      <div className="w-full max-w-md bg-white border border-zinc-100 rounded-[1.5rem] p-8 lg:p-12 shadow-soft animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-[#D4C4B7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D4C4B7]/20">
            <span className="text-white font-black text-xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-[#333333] mb-2 tracking-tight">MEKIE Enterprise</h1>
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-medium italic">Hệ thống đồng bộ đa khách thuê</p>
        </div>

        {/* [NEW] TOGGLE MODE */}
        <div className="flex bg-[#F9FAFB] p-1 rounded-2xl mb-8 border border-zinc-100">
          <button onClick={() => setIsJoining(false)} className={`flex-1 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${!isJoining ? 'bg-white shadow-sm text-[#333333]' : 'text-zinc-400'}`}>Mở Shop Mới</button>
          <button onClick={() => setIsJoining(true)} className={`flex-1 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${isJoining ? 'bg-white shadow-sm text-[#333333]' : 'text-zinc-400'}`}>Gia Nhập Shop</button>
        </div>

        {error && <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 text-center border border-red-100 font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isJoining && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Mã Shop (Unique ID)</label>
              <input required type="text" placeholder="ten-shop-cua-ban" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#D4C4B7] outline-none" value={formData.tenant_id} onChange={e => setFormData({...formData, tenant_id: e.target.value})} />
            </div>
          )}

          {!isJoining && (
            <div className="animate-in slide-in-from-top-4 duration-400 delay-75">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Tên Hiển Thị Của Shop</label>
              <input required type="text" placeholder="Luxury Store HN" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#D4C4B7] outline-none" value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} />
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Email Công Ty / Cá Nhân</label>
            <input required type="email" placeholder="name@company.com" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#D4C4B7] outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#8FA08A] mb-2 block ml-1 font-bold italic underline">Mã bảo mật {isJoining ? '(Để gia nhập)' : '(Để mời người khác)'}</label>
            <input required type="password" placeholder="••••••" className="w-full bg-[#F9FAFB] border border-[#8FA08A]/30 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none font-black tracking-widest" value={formData.access_code} onChange={e => setFormData({...formData, access_code: e.target.value})} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Mật khẩu cá nhân</label>
            <input required type="password" placeholder="••••••••" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#D4C4B7] outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#333333] text-white font-bold py-4 rounded-xl hover:bg-black transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-6 shadow-xl">
            {loading ? 'Đang xác thực...' : (isJoining ? 'Gia Nhập' : 'Mở Shop Ngay')}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-zinc-400">Đã có shop? <Link to="/login" className="text-[#333333] hover:underline font-bold">Đăng nhập</Link></p>
      </div>
    </div>
  );
}
