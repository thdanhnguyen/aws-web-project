import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({
    tenant_id: '',
    tenant_name: '',
    email: '',
    password: ''
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
        alert('Đăng ký Shop thành công!');
        navigate('/login');
      } else {
        setError(data.error || 'Đăng ký thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBF9] flex items-center justify-center p-4 font-outfit">
      <div className="w-full max-w-md bg-white border border-zinc-100 rounded-[1.5rem] p-8 lg:p-12 shadow-soft animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-[#D4C4B7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D4C4B7]/20">
            <span className="text-white font-black text-xl">L</span>
          </div>
          <h1 className="text-3xl font-bold text-[#333333] mb-2 tracking-tight">Open Shop</h1>
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-medium italic">Khởi đầu kỷ nguyên bán hàng mới</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 text-center border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Mã Shop (Tenant ID)</label>
            <input 
              required
              type="text" 
              placeholder="ten-shop-cua-ban"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm text-[#333333] focus:border-[#D4C4B7] transition-all outline-none"
              value={formData.tenant_id}
              onChange={e => setFormData({...formData, tenant_id: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Tên Hiển Thị</label>
            <input 
              required
              type="text" 
              placeholder="Sieu Thi LUXURY"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm text-[#333333] focus:border-[#D4C4B7] transition-all outline-none"
              value={formData.tenant_name}
              onChange={e => setFormData({...formData, tenant_name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Email Hoạt Động</label>
            <input 
              required
              type="email" 
              placeholder="admin@exclusive.com"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm text-[#333333] focus:border-[#D4C4B7] transition-all outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Mật Khẩu</label>
            <input 
              required
              type="password" 
              placeholder="••••••••"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm text-[#333333] focus:border-[#D4C4B7] transition-all outline-none"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#333333] text-white font-bold py-4 rounded-xl hover:bg-black transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-6 shadow-xl"
          >
            {loading ? 'Đang tạo shop...' : 'Bắt đầu ngay'}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-zinc-400">
          Đã có shop? <Link to="/login" className="text-[#333333] hover:underline font-bold">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
