import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export default function SystemDashboard() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('system_token');
  const adminEmail = sessionStorage.getItem('system_email');

  const [view, setView] = useState<'shops' | 'create'>('shops');
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    tenant_id: '', tenant_name: '', email: '',
    password: '', full_name: '', access_code: ''
  });
  const [creating, setCreating] = useState(false);

  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!token) navigate('/system');
  }, [token, navigate]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/system/tenants`, { headers: authHeaders });
      if (res.status === 401) { sessionStorage.clear(); navigate('/system'); return; }
      const data = await res.json();
      if (data.success) setTenants(data.data);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/system/tenants`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Tạo shop thành công!');
        setForm({ tenant_id: '', tenant_name: '', email: '', password: '', full_name: '', access_code: '' });
        setView('shops');
        fetchTenants();
      } else {
        toast.error(data.error || 'Tạo shop thất bại');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({ id, name });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    const res = await fetch(`${API_URL}/system/tenants/${encodeURIComponent(confirmModal.id)}`, {
      method: 'DELETE', headers: authHeaders
    });
    const data = await res.json();
    setConfirmModal(null);
    if (data.success) { toast.success(data.message); fetchTenants(); }
    else toast.error(data.error || 'Lỗi xóa shop');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('system_token');
    sessionStorage.removeItem('system_email');
    navigate('/system');
  };

  const NavBtn = ({ v, label, icon }: { v: 'shops' | 'create', label: string, icon: string }) => (
    <button
      onClick={() => setView(v)}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-left ${view === v ? 'bg-amber-400/10 text-amber-400' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className="hidden lg:inline text-[10px] uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-outfit flex overflow-hidden">

      {/* Confirm Delete Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-red-500/20 rounded-[2rem] p-10 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Xóa Shop</h3>
            <p className="text-zinc-400 text-sm mb-2">
              Bạn sắp xóa toàn bộ dữ liệu của shop:
            </p>
            <p className="text-white font-black text-lg mb-1">{confirmModal.name}</p>
            <p className="font-mono text-zinc-600 text-xs mb-8">{confirmModal.id}</p>
            <p className="text-red-400 text-xs mb-8 bg-red-400/5 border border-red-400/10 rounded-xl px-4 py-3">
              Hành động này sẽ xóa toàn bộ sản phẩm, nhân viên, lịch sử giao dịch và không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-white/5 text-zinc-400 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-white/10 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-red-400 transition-all"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-16 lg:w-64 bg-[#161616] border-r border-white/5 flex flex-col py-6 px-3 lg:px-5 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-1">
          <img src="/logo.png" alt="MEKIE" className="w-9 h-9 rounded-xl shrink-0 shadow-lg shadow-black/20 bg-white p-0.5" />
          <div className="hidden lg:block">
            <div className="font-black text-sm tracking-tight">
              <span className="text-[#4285F4]">M</span>
              <span className="text-[#EA4335]">E</span>
              <span className="text-[#FBBC05]">K</span>
              <span className="text-[#4285F4]">I</span>
              <span className="text-[#34A853]">E</span>
              <span className="text-zinc-400 ml-1 font-medium tracking-normal">SYSTEM</span>
            </div>
            <div className="text-zinc-600 text-[9px] uppercase tracking-widest">Super Admin</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavBtn v="shops" label="Quản Lý Shop" icon="🏪" />
          <NavBtn v="create" label="Tạo Shop Mới" icon="➕" />
        </nav>

        <div className="border-t border-white/5 pt-4">
          <div className="hidden lg:block text-[9px] text-zinc-600 uppercase tracking-widest mb-1 px-1 truncate">{adminEmail}</div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-400/5 transition-all text-[10px] uppercase font-bold tracking-widest">
            🚪 <span className="hidden lg:inline">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 lg:p-12 overflow-y-auto">

        {/* VIEW: SHOPS */}
        {view === 'shops' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl font-light tracking-tight">Danh Sách Shop</h2>
                <p className="text-zinc-500 text-sm mt-1">{tenants.length} shop đang hoạt động</p>
              </div>
              <button
                onClick={() => setView('create')}
                className="bg-amber-400 text-black font-black px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 self-start"
              >
                + Tạo Shop Mới
              </button>
            </header>

            {loading ? (
              <div className="text-center text-zinc-600 py-20 text-sm">Đang tải...</div>
            ) : (
              <div className="bg-[#161616] rounded-[2rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] uppercase tracking-[0.15em] text-zinc-600 border-b border-white/5">
                    <tr>
                      <th className="px-8 py-5">Shop</th>
                      <th className="px-8 py-5">Domain</th>
                      <th className="px-8 py-5 text-center">Admin</th>
                      <th className="px-8 py-5 text-center">Staff</th>
                      <th className="px-8 py-5">Ngày tạo</th>
                      <th className="px-8 py-5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tenants.map(t => (
                      <tr key={t.id} className="hover:bg-white/3 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="font-bold text-white">{t.name}</div>
                          <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{t.id}</div>
                        </td>
                        <td className="px-8 py-5 text-zinc-400 text-xs">{t.domain || '—'}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-amber-400/10 text-amber-400 text-[10px] font-black px-3 py-1 rounded-full">{t.admin_count}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-white/5 text-zinc-400 text-[10px] font-black px-3 py-1 rounded-full">{t.staff_count}</span>
                        </td>
                        <td className="px-8 py-5 text-zinc-500 text-xs">{formatDate(t.created_at)}</td>
                        <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-red-400 transition-colors"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                    {tenants.length === 0 && (
                      <tr><td colSpan={6} className="px-8 py-16 text-center text-zinc-700 text-xs italic">Chưa có shop nào</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW: CREATE SHOP */}
        {view === 'create' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl">
            <header className="mb-10">
              <h2 className="text-4xl font-light tracking-tight">Tạo Shop Mới</h2>
              <p className="text-zinc-500 text-sm mt-1">Khởi tạo tenant + tài khoản Admin</p>
            </header>

            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Mã Shop (ID) *</label>
                  <input required type="text" placeholder="sunshine-hn"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                    value={form.tenant_id}
                    onChange={e => setForm({ ...form, tenant_id: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Tên Shop *</label>
                  <input required type="text" placeholder="Sunshine HN"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                    value={form.tenant_name}
                    onChange={e => setForm({ ...form, tenant_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Tên Admin</label>
                <input type="text" placeholder="Nguyễn Văn A"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Email Admin *</label>
                <input required type="email" placeholder="admin@sunshine.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 block font-bold">Mật khẩu Admin *</label>
                <input required type="password" placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-500 mb-2 block font-bold">Access Code (Mã mời Staff) *</label>
                <input required type="text" placeholder="Mã bảo mật để Admin mời Staff vào shop"
                  className="w-full bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-700 focus:border-amber-400/50 outline-none transition-all"
                  value={form.access_code}
                  onChange={e => setForm({ ...form, access_code: e.target.value })}
                />
                <p className="text-[10px] text-zinc-600 mt-1.5">Admin shop sẽ cần mã này để đăng ký tài khoản Staff.</p>
              </div>

              <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setView('shops')}
                  className="flex-1 bg-white/5 text-zinc-400 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-white/10 transition-all">
                  Hủy
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-amber-400 text-black py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 disabled:opacity-50">
                  {creating ? 'Đang tạo...' : 'Khởi Tạo Shop'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
