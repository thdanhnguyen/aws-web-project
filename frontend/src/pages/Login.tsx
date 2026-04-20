import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
      // [LEARN] Khi đăng nhập, ta phải bật credentials: 'include' 
      // để trình duyệt cho phép nhận Cookie từ Server
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // [FIX] Cho phép trình duyệt nhận Cookie từ Server
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        // [LEARN] CHỈ lưu User info vào LocalStorage để hiện tên
        // TUYỆT ĐỐI không lưu Access Token vào đây như sếp yêu cầu
        localStorage.setItem('pos_user', JSON.stringify(data.user));
        
        // Chuyển hướng về trang quản trị Dashboard (/pos)
        navigate('/pos'); 
      } else {
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch (err) {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBF9] flex items-center justify-center p-4 font-outfit relative">
      <Link to="/" className="absolute top-8 left-8 lg:top-12 lg:left-12 text-zinc-400 hover:text-[#333333] transition-colors text-xs font-black tracking-widest uppercase flex items-center gap-2">
        <span className="text-lg">←</span> Trang chủ
      </Link>
      <div className="w-full max-w-md bg-white border border-zinc-100 rounded-[1.5rem] p-8 lg:p-12 shadow-soft animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-[#8FA08A] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#8FA08A]/20">
            <span className="text-white font-black text-xl">M</span>
          </div>
          <h1 className="text-3xl font-bold text-[#333333] mb-2 tracking-tight">MEKIE POS</h1>
          <p className="text-zinc-400 text-[10px] uppercase tracking-[0.2em] font-medium">Bán hàng tinh tế</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl text-xs mb-6 text-center border border-red-100 font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Email Address</label>
            <input 
              required
              type="email" 
              placeholder="admin@exclusive.com"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-5 py-4 text-sm text-[#333333] focus:border-[#8FA08A] transition-all outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block ml-1 font-bold">Password</label>
            <input 
              required
              type="password" 
              placeholder="••••••••"
              className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-5 py-4 text-sm text-[#333333] focus:border-[#8FA08A] transition-all outline-none"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#8FA08A] text-white font-bold py-4 rounded-xl hover:bg-[#7A8B76] transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-4 shadow-lg shadow-[#8FA08A]/20"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-10 text-xs text-zinc-400">
          Chưa có tài khoản? <Link to="/register" className="text-[#8FA08A] hover:underline font-bold transition-all">Đăng ký shop mới</Link>
        </p>
      </div>
    </div>
  );
}
