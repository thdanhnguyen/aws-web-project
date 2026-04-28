import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicStore from './pages/PublicStore';
import SystemLogin from './pages/SystemLogin';
import SystemDashboard from './pages/SystemDashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const COLORS = [
  { name: 'Black', hex: '#000000', class: 'bg-black' },
  { name: 'White', hex: '#ffffff', class: 'bg-white border border-zinc-200' },
  { name: 'Grey', hex: '#71717a', class: 'bg-zinc-400' }
];
// [LEARN] Mảng SIZES dùng để render danh sách nút chọn size bằng .map()
// Thay vì viết lặp 4 nút HTML thủ công, ta dùng vòng lặp để code ngắn gọn và dễ thêm size mới.
const SIZES = ['S', 'M', 'L', 'XL'];

const formatVND = (amount: any) => {
  const value = parseFloat(amount) * 1000; 
  if (isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatVietnamTime = (dateStr: string) => {
  if (!dateStr) return '';
  try {
      const dateObj = new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`);
      return new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false
      }).format(dateObj);
  } catch {
      return dateStr;
  }
};

function POSPage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'sell' | 'history' | 'warehouse' | 'shift' | 'staff'>('sell');
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [tempSelection, setTempSelection] = useState({ color: 'Black', size: 'S' });
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Shift & Staff state
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '' });
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const navigate = useNavigate();

  // [LEARN] Anti-lag Search: Tách state thành 2 lớp
  // searchQuery: cập nhật tức thì khi gõ (controlled input)
  // debouncedQuery: chỉ cập nhật sau khi ngừng gõ 300ms (trigger lọc dữ liệu)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // [LEARN] State lưu thông tin khách hàng khi cashier tạo đơn nội bộ
  // Thay thế cho chuỗi hard-code 'khachang@demo.com' trước đây
  const [customerInput, setCustomerInput] = useState({ name: '', email: '' });
  
  // State for checkout modal
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean, 
    method?: 'cash' | 'transfer', 
    invoiceId?: string, 
    total?: number, 
    status?: 'selecting' | 'polling' | 'success'
  }>({ isOpen: false, status: 'selecting' });

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery) return products;
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    return products.filter((p: any) => p.name.toLowerCase().includes(lowerQuery) || (p.price && p.price.toString().includes(lowerQuery)));
  }, [debouncedQuery, products]);

  // 📊 Dashboard Aggregations (Computed on-the-fly)
  const totalRevenue = useMemo(() => history.reduce((sum, item) => sum + parseFloat(item.total_amount), 0), [history]);
  const totalOrders = history.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const recentOrders = useMemo(() => [...history].slice(0, 5), [history]);

  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      } else {
        navigate('/login');
        return null;
      }
    } catch (err) {
      navigate('/login');
      return null;
    }
  }, [navigate]);

  const fetchWithAuth = useCallback(async (url: string, options: any = {}) => {
    let token = accessToken;
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    let res = await fetch(url, { ...options, headers });
    // Chỉ retry khi 401 (hết hạn token) — KHÔNG retry 403 (thiếu quyền)
    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders = { ...options.headers, 'Authorization': `Bearer ${newToken}` };
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }
    return res;
  }, [accessToken, refreshAccessToken]);

  const fetchProducts = useCallback(async (token?: string) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token || accessToken}` }
    });
    const payload = await res.json();
    if (payload.success) setProducts(payload.data);
  }, [accessToken]);

  const fetchHistory = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/transactions/history`);
    const payload = await res.json();
    if (payload.success) setHistory(payload.data);
  }, [fetchWithAuth]);

  const fetchCurrentShift = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/shifts/current`);
    const payload = await res.json();
    if (payload.success) {
      setCurrentShift(payload.data);
      return payload.data; // trả về để startup dùng
    }
    return null;
  }, [fetchWithAuth]);

  const fetchStaff = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/auth/staff`);
    const payload = await res.json();
    if (payload.success) setStaffList(payload.data);
  }, [fetchWithAuth]);

  const fetchAllShifts = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/shifts`);
    const payload = await res.json();
    if (payload.success) setAllShifts(payload.data);
  }, [fetchWithAuth]);

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    refreshAccessToken().then(async (token) => {
      if (token) {
        fetchProducts(token);
        // Kiểm tra ca hiện tại — nếu chưa có ca, chuyển vào view Ca Làm
        const shift = await fetchCurrentShift();
        if (!shift) setActiveView('shift');
        else setActiveView('sell');
      }
      setLoading(false);
    });
  }, [refreshAccessToken, fetchProducts, fetchCurrentShift]);

  useEffect(() => {
    if (activeView === 'history' || activeView === 'dashboard') fetchHistory();
    if (activeView === 'warehouse' || activeView === 'sell') fetchProducts();
    if (activeView === 'shift') {
      fetchCurrentShift();
      // fetchAllShifts chỉ gọi cho admin — staff không có quyền
      const u = JSON.parse(localStorage.getItem('pos_user') || '{}');
      if (u.role === 'admin') fetchAllShifts();
    }
    if (activeView === 'staff') fetchStaff();
    setSearchQuery('');
  }, [activeView, fetchHistory, fetchProducts, fetchCurrentShift, fetchStaff, fetchAllShifts]);

  const handleLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('pos_user');
    setAccessToken(null);
    navigate('/login');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;

    const method = isAddingNew ? 'POST' : 'PUT';
    const url = isAddingNew ? `${API_URL}/products` : `${API_URL}/products/${editProduct.id}`;

    const res = await fetchWithAuth(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProduct)
    });
    const data = await res.json();
    if (data.success) {
      toast.success(isAddingNew ? "Nhập hàng thành công!" : "Cập nhật thành công!");
      setEditProduct(null);
      setIsAddingNew(false);
      fetchProducts();
    } else {
      toast.error(data.error || "Có lỗi xảy ra");
    }
  };

  const openAddModal = () => {
    setIsAddingNew(true);
    setEditProduct({ name: '', price: 0, description: '', material: 'Cotton', origin: 'Vietnam', category: 'Uncategorized' });
  };

  const openEditModal = (p: any) => {
    setIsAddingNew(false);
    setEditProduct(p);
  };

  const addToCart = () => {
    if (!activeProduct) return;
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(item => 
        item.id === activeProduct.id && item.color === tempSelection.color && item.size === tempSelection.size
      );
      if (existingItemIndex > -1) {
        return currentCart.map((item, index) => index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...currentCart, { ...activeProduct, ...tempSelection, quantity: 1 }];
      }
    });
    setActiveProduct(null);
  };

  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) return toast.error("Giỏ hàng trống");
    setCheckoutModal({ isOpen: true, status: 'selecting', total: subtotal + tax });
  };

  const processCheckout = async (method: 'cash' | 'transfer') => {
    const payloadItems = cart.map(item => ({
      product_id: item.id, quantity: item.quantity, color: item.color, size: item.size
    }));
    
    setCheckoutModal(prev => ({ ...prev, method, status: 'polling' }));

    const res = await fetchWithAuth(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerInput.name || 'Khách lẻ',
        customer_email: customerInput.email || 'khach@pos.local',
        items: payloadItems,
        payment_method: method
      })
    });
    const data = await res.json();
    
    if (data.success) {
      if (method === 'cash') {
        toast.success("Thanh toán tiền mặt thành công!");
        setCart([]);
        setCustomerInput({ name: '', email: '' });
        fetchHistory();
        setCheckoutModal({ isOpen: false, status: 'selecting' });
      } else {
        // Nếu là chuyển khoản, lưu lại invoiceId để hiển thị QR và bắt đầu polling
        setCheckoutModal(prev => ({ ...prev, invoiceId: data.receipt?.id, status: 'polling' }));
      }
    } else {
      toast.error(data.error || data.message || "Thanh toán thất bại");
      setCheckoutModal({ isOpen: false, status: 'selecting' });
    }
  };

  // Polling trạng thái thanh toán từ SePay
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (checkoutModal.isOpen && checkoutModal.method === 'transfer' && checkoutModal.invoiceId && checkoutModal.status === 'polling') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/transactions/${checkoutModal.invoiceId}/status`);
          const data = await res.json();
          if (data.success && data.payment_status === 'Paid') {
            setCheckoutModal(prev => ({ ...prev, status: 'success' }));
            toast.success("Khách hàng đã chuyển khoản thành công!");
            setCart([]);
            setCustomerInput({ name: '', email: '' });
            fetchHistory();
            clearInterval(interval);
            setTimeout(() => setCheckoutModal({ isOpen: false, status: 'selecting' }), 3000);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000); // Polling mỗi 3 giây
    }
    return () => clearInterval(interval);
  }, [checkoutModal]);

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  // Handler mở ca
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_URL}/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_cash: parseFloat(openingCash) || 0 })
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Đã mở ca làm việc!');
      setCurrentShift(data.data);
      setOpeningCash('');
      setActiveView('sell');
    } else {
      toast.error(data.error || 'Lỗi mở ca');
    }
  };

  // Handler đóng ca
  const handleCloseShift = async () => {
    if (!window.confirm('Xác nhận đóng ca làm việc?')) return;
    const res = await fetchWithAuth(`${API_URL}/shifts/close`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      toast.success('Đóng ca thành công!');
      setCurrentShift(null);
      setAllShifts(prev => [data.data, ...prev]);
    } else {
      toast.error(data.error || 'Lỗi đóng ca');
    }
  };

  // Handler tạo staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_URL}/auth/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    });
    const data = await res.json();
    if (data.success) {
      toast.success('Tạo nhân viên thành công!');
      setNewStaff({ email: '', password: '', full_name: '' });
      fetchStaff();
    } else {
      toast.error(data.error || 'Lỗi tạo nhân viên');
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm('Xóa nhân viên này?')) return;
    const res = await fetchWithAuth(`${API_URL}/auth/staff/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { toast.success('Đã xóa nhân viên'); fetchStaff(); }
    else toast.error(data.error || 'Lỗi xóa nhân viên');
  };

  if (loading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center font-outfit uppercase tracking-widest text-zinc-400 text-xs">Authenticating...</div>;

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#333333] font-outfit flex overflow-hidden w-full">
      {/* Sidebar (Duy trì tính nhất quán) */}
      <aside className="w-16 md:w-20 lg:w-64 bg-white border-r border-zinc-100 flex flex-col py-4 px-2 lg:px-4 shrink-0 shadow-sm z-50">
        <div className="flex items-center mb-10 px-2 pt-4">
          <img src="/logo.png" alt="MEKIE" className="w-10 h-10 rounded-xl mr-3 shrink-0 shadow-lg" />
          <h1 className="text-lg font-black hidden lg:block tracking-tighter text-center">
            <span className="text-[#4285F4]">M</span>
            <span className="text-[#EA4335]">E</span>
            <span className="text-[#FBBC05]">K</span>
            <span className="text-[#4285F4]">I</span>
            <span className="text-[#34A853]">E</span>
            <span className="text-zinc-500 ml-1 font-medium tracking-normal">POS</span>
          </h1>
        </div>
        <nav className="flex-1 space-y-2">
          {/* Bán Hàng — tất cả role đều thấy */}
          <button onClick={() => setActiveView('sell')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'sell' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">🛒</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Bán Hàng</span>
          </button>
          {/* Lịch Sử — tất cả role */}
          <button onClick={() => setActiveView('history')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'history' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">📜</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Lịch Sử</span>
          </button>
          {/* Ca Làm — tất cả role */}
          <button onClick={() => setActiveView('shift')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'shift' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">⏱️</span>
            <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Ca Làm</span>
            {currentShift && <span className="hidden lg:inline ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>}
          </button>
          {/* ADMIN ONLY */}
          {user?.role === 'admin' && (
            <>
              <button onClick={() => setActiveView('dashboard')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'dashboard' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                <span className="text-lg">📊</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Tổng Quan</span>
              </button>
              <button onClick={() => setActiveView('warehouse')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'warehouse' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                <span className="text-lg">📦</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Kho Hàng</span>
              </button>
              <button onClick={() => setActiveView('staff')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'staff' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
                <span className="text-lg">👥</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Nhân Viên</span>
              </button>
            </>
          )}
        </nav>
        <div className="pt-6 border-t border-zinc-50 p-2">
           <div className="hidden lg:block uppercase text-[10px] text-zinc-300 font-bold tracking-widest mb-1">{user?.email}</div>
           <div className="hidden lg:flex items-center gap-2 mb-1">
             <span className="text-[#8FA08A] text-xs font-black truncate">{user?.full_name || user?.tenant_id}</span>
             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${user?.role === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>{user?.role}</span>
           </div>
           <button onClick={handleLogout} className="w-full mt-4 flex items-center p-4 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-all text-[10px] uppercase font-bold tracking-widest">🚪 <span className="hidden lg:inline ml-3">Đăng xuất</span></button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-14 overflow-y-auto bg-[#FBFBF9] custom-scrollbar">
        
        {/* VIEW: CA LÀM VIỆC (SHIFT) */}
        {activeView === 'shift' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500 max-w-2xl mx-auto">
            <header className="mb-10"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Ca Làm</h2></header>
            {currentShift ? (
              <div className="bg-white rounded-[3rem] p-12 border border-zinc-100 shadow-soft">
                <div className="flex items-center gap-4 mb-8">
                  <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-xs uppercase font-black tracking-widest text-emerald-600">Ca đang mở</span>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div><p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Mở lúc</p><p className="font-black text-lg">{formatVietnamTime(currentShift.opened_at)}</p></div>
                  <div><p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Tiền đầu ca</p><p className="font-black text-lg text-[#8FA08A]">{formatVND(currentShift.opening_cash)}</p></div>
                  <div><p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Nhân viên</p><p className="font-black">{currentShift.full_name || currentShift.email}</p></div>
                </div>
                <button onClick={handleCloseShift} className="w-full bg-[#333333] text-white py-5 rounded-2xl uppercase text-[10px] font-black tracking-widest hover:bg-black transition-all active:scale-[0.98]">
                  Đóng Ca &amp; Tổng Kết
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-12 border border-zinc-100 shadow-soft">
                <h3 className="text-2xl font-light italic mb-8">Mở ca mới</h3>
                <form onSubmit={handleOpenShift} className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tiền mặt đầu ca (VNĐ × 1000)</label>
                    <input type="number" min="0" placeholder="VD: 2000 (= 2.000.000đ)" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-4 text-sm focus:border-[#8FA08A] outline-none" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
                  </div>
                  <button type="submit" className="w-full bg-[#8FA08A] text-white py-5 rounded-2xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-[#8FA08A]/20 hover:shadow-xl transition-all">
                    Xác Nhận Mở Ca
                  </button>
                </form>
              </div>
            )}
            {/* Lịch sử ca (chỉ admin thấy) */}
            {user?.role === 'admin' && allShifts.length > 0 && (
              <div className="mt-10">
                <h3 className="text-xl font-light italic mb-6">Lịch Sử Ca</h3>
                <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-soft overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-widest font-black text-zinc-400">
                      <tr>
                        <th className="p-6">Nhân Viên</th>
                        <th className="p-6">Mở Ca</th>
                        <th className="p-6">Trạng Thái</th>
                        <th className="p-6 text-right">Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {allShifts.map((s: any) => (
                        <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="p-6 font-bold">{s.full_name || s.email}</td>
                          <td className="p-6 text-zinc-400">{formatVietnamTime(s.opened_at)}</td>
                          <td className="p-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>{s.status === 'open' ? 'Đang mở' : 'Đã đóng'}</span>
                          </td>
                          <td className="p-6 text-right font-black text-[#8FA08A]">{formatVND(s.total_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: NHÂN VIÊN (STAFF) — Admin only */}
        {activeView === 'staff' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <header className="mb-10"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Nhân Viên</h2></header>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form tạo nhân viên mới */}
              <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-soft">
                <h3 className="text-xl font-light italic mb-8">Thêm nhân viên mới</h3>
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tên đầy đủ</label>
                    <input required type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={newStaff.full_name} onChange={e => setNewStaff({...newStaff, full_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Email</label>
                    <input required type="email" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Mật khẩu</label>
                    <input required type="password" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-[#8FA08A] text-white py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-[#8FA08A]/20 mt-4">Tạo Tài Khoản</button>
                </form>
              </div>
              {/* Danh sách nhân viên */}
              <div className="lg:col-span-2 bg-white rounded-[3rem] border border-zinc-100 shadow-soft overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-widest font-black text-zinc-400">
                    <tr>
                      <th className="p-8">Tên</th>
                      <th className="p-8">Email</th>
                      <th className="p-8">Vai Trò</th>
                      <th className="p-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {staffList.map((s: any) => (
                      <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-8 font-bold">{s.full_name}</td>
                        <td className="p-8 text-zinc-400">{s.email}</td>
                        <td className="p-8">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.role === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>{s.role}</span>
                        </td>
                        <td className="p-8 text-right">
                          {s.role === 'staff' && (
                            <button onClick={() => handleDeleteStaff(s.id)} className="text-zinc-300 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest">Xóa</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {staffList.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-zinc-400 italic text-xs">Chưa có nhân viên</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD */}
        {activeView === 'dashboard' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
             <header className="mb-14"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Dashboard</h2></header>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">
                <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-soft relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-[#8FA08A] mb-4">Total Revenue</div>
                   <div className="text-3xl font-black">{formatVND(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-soft relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-4">Total Orders</div>
                   <div className="text-3xl font-black">{totalOrders} <span className="text-xs uppercase text-zinc-400 tracking-normal ml-1">đơn</span></div>
                </div>
                <div className="bg-[#333333] text-white rounded-[3rem] p-10 border border-zinc-800 shadow-xl relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-4">Avg Order Value</div>
                   <div className="text-3xl font-black text-[#8FA08A]">{formatVND(avgOrderValue)}</div>
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-light italic mb-8">Recent Transactions</h3>
                <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-soft overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400"><tr><th className="p-6 lg:p-8">Mã Đơn</th><th className="p-6 lg:p-8">Khách Hàng</th><th className="p-6 lg:p-8">Thời Gian</th><th className="p-6 lg:p-8 text-right">Tổng Tiền</th></tr></thead>
                      <tbody className="divide-y divide-zinc-50 text-sm">
                        {recentOrders.map((h, i) => (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="p-6 lg:p-8 font-bold text-[#8FA08A]">#{h.id}</td>
                            <td className="p-6 lg:p-8">{h.customer_name || 'Khách vãng lai'}</td>
                            <td className="p-6 lg:p-8 text-zinc-400">{formatVietnamTime(h.created_at || h.create_at)}</td>
                            <td className="p-6 lg:p-8 text-right font-black">{formatVND(h.total_amount)}</td>
                          </tr>
                        ))}
                        {recentOrders.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-zinc-400 italic text-xs">Chưa có giao dịch nào</td></tr>}
                      </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: SELL (POS) */}
        {activeView === 'sell' && (
          <div className="animate-in fade-in duration-500 flex flex-col xl:flex-row h-full gap-6 lg:gap-10">
            <div className="flex-1">
                <header className="mb-10 lg:mb-14 border-b border-zinc-100 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                   <h2 className="text-5xl font-light italic text-[#333333]">Storefront</h2>
                   <input 
                      type="text" 
                      placeholder="Tìm món hàng..." 
                      className="bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-sm w-full lg:w-72 font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredProducts.map((product) => {
                    // [NEW] Kiểm tra tồn kho: nếu stock = 0 hoặc undefined thì coi là hết hàng
                    const outOfStock = (product.stock ?? 0) <= 0;
                    return (
                      <div
                        key={product.id}
                        // [LEARN] Chỉ gọi setActiveProduct khi còn hàng — dùng điều kiện `&& !outOfStock`
                        // để ngăn click vào sản phẩm hết hàng mà không cần disabled prop (div không có disabled)
                        onClick={() => !outOfStock && setActiveProduct(product)}
                        className={`bg-white border border-zinc-100 p-8 lg:p-10 rounded-[2.5rem] shadow-soft flex flex-col items-center text-center relative transition-all
                          ${outOfStock
                            ? 'opacity-40 grayscale cursor-not-allowed'          // Mờ + xám + không cho click
                            : 'shadow-hover cursor-pointer group hover:shadow-xl' // Bình thường: hover effect
                          }`}
                      >
                        <h3 className="text-sm font-bold text-[#333333] mb-1">{product.name}</h3>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-widest mb-2">{product.category}</p>
                        <p className="text-[#8FA08A] font-black text-lg">{formatVND(product.price)}</p>
                        {/* [NEW] Badge "Hết hàng" nổi lên góc trên phải của card khi stock = 0 */}
                        {outOfStock && (
                          <span className="absolute top-4 right-4 bg-red-50 text-red-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                            Hết hàng
                          </span>
                        )}
                      </div>
                    );
                  })}

                {filteredProducts.length === 0 && <div className="col-span-full py-20 text-center text-zinc-400 text-xs italic tracking-widest uppercase">Không tìm thấy sản phẩm</div>}
                </div>
            </div>

            {/* Panel Giỏ hàng + Thông tin khách hàng */}
            <div className="w-full xl:w-[400px] bg-white rounded-[3rem] p-6 lg:p-10 shadow-2xl flex flex-col border border-zinc-50 h-fit sticky top-0 z-10 mx-auto xl:mx-0">
                 <h3 className="text-2xl font-light italic mb-6">Cart</h3>
                 <div className="flex-1 space-y-3 max-h-[320px] overflow-y-auto pr-2 mb-4">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm border-b border-zinc-50 pb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">{item.color} / {item.size}</p>
                        </div>
                        {/* Nút +/- số lượng */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setCart(c => c.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                            className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-black flex items-center justify-center"
                          >−</button>
                          <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                          <button
                            onClick={() => setCart(c => c.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))}
                            className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors text-xs font-black flex items-center justify-center"
                          >+</button>
                        </div>
                        <span className="font-bold text-xs shrink-0 w-16 text-right">{formatVND(parseFloat(item.price) * item.quantity)}</span>
                        <button onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="text-zinc-300 hover:text-red-400 transition-colors text-sm leading-none shrink-0">✕</button>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-center text-zinc-300 text-xs italic py-8">Chưa có sản phẩm</p>}
                 </div>

                 {/* [NEW] Form nhập thông tin khách hàng cho cashier
                     Trước đây hard-code 'khachang@demo.com', bây giờ cashier có thể nhập tên/email thật */}
                 <div className="border-t border-zinc-50 pt-6 mb-4 space-y-3">
                   <input
                     type="text" placeholder="Tên khách hàng"
                     className="w-full bg-[#F9FAFB] rounded-xl px-4 py-3 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                     value={customerInput.name}
                     onChange={e => setCustomerInput(p => ({...p, name: e.target.value}))}
                   />
                   <input
                     type="email" placeholder="Email (tùy chọn)"
                     className="w-full bg-[#F9FAFB] rounded-xl px-4 py-3 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                     value={customerInput.email}
                     onChange={e => setCustomerInput(p => ({...p, email: e.target.value}))}
                   />
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-xs text-zinc-400"><span>Subtotal</span><span className="font-bold">{formatVND(subtotal)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400"><span>Tax (10%)</span><span className="font-bold">{formatVND(tax)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-50"><span>Total</span><span className="text-xl font-black text-[#8FA08A]">{formatVND(total)}</span></div>
                    <button onClick={handleOpenCheckoutModal} className="w-full bg-[#8FA08A] text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-[#8FA08A]/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Thanh toán</button>
                 </div>
            </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {activeView === 'history' && (
          <div className="animate-in slide-in-from-right-10 duration-500">
            <header className="mb-14"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">History</h2></header>
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-soft overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                    <tr>
                      <th className="p-8">Mã Đơn</th>
                      <th className="p-8">Khách Hàng</th>
                      <th className="p-8">Thời Gian</th>
                      <th className="p-8">Trạng Thái</th>
                      <th className="p-8 text-right">Tổng Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {history.map((h, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-8 font-bold text-[#8FA08A]"># {h.id}</td>
                        <td className="p-8">{h.customer_name || 'Khách vãng lai'}</td>
                        <td className="p-8 text-zinc-400">{formatVietnamTime(h.created_at || h.create_at)}</td>
                        {/* [NEW] Badge trạng thái thanh toán — hiển thị màu xanh nếu Paid, màu xám nếu Unpaid */}
                        <td className="p-8">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            h.payment_status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-zinc-100 text-zinc-400'
                          }`}>{h.payment_status || 'Unpaid'}</span>
                        </td>
                        <td className="p-8 text-right font-black">{formatVND(h.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {/* VIEW: WAREHOUSE */}
        {activeView === 'warehouse' && (
           <div className="animate-in slide-in-from-bottom-10 duration-500">
             <header className="mb-14 flex flex-col lg:flex-row justify-between lg:items-end gap-6">
                <h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Warehouse</h2>
                <input 
                   type="text" 
                   placeholder="Tìm sản phẩm trong kho..." 
                   className="bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-sm w-full lg:w-80 font-medium"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                />
             </header>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-soft flex justify-between items-center group">
                    <div className="flex gap-6 items-center">
                        <div>
                          <h4 className="font-bold text-lg">{p.name}</h4>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{p.category} | {p.material} | {p.origin}</p>
                          {/* [NEW] Badge tồn kho: xanh nếu còn hàng, đỏ nếu hết hàng */}
                          <span className={`mt-2 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            (p.stock ?? 0) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400'
                          }`}>
                            {(p.stock ?? 0) > 0 ? `Kho: ${p.stock}` : 'Hết hàng'}
                          </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-[#8FA08A] mb-3">{formatVND(p.price)}</p>
                        <button onClick={() => openEditModal(p)} className="bg-[#333333] text-white px-5 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-black transition-all">Sửa kho</button>
                    </div>
                  </div>
                ))}
                <button onClick={openAddModal} className="bg-[#F9FAFB] border-2 border-dashed border-zinc-100 rounded-[3rem] flex flex-col items-center justify-center p-12 text-zinc-300 hover:text-[#8FA08A] hover:border-[#8FA08A]/30 transition-all group">
                   <span className="text-4xl mb-4 group-hover:scale-125 transition-transform">+</span>
                   <span className="text-[10px] uppercase font-black tracking-widest">Thêm sản phẩm mới</span>
                </button>
             </div>
           </div>
        )}
      </main>

      {/* MODAL: ĐA NĂNG (DÙNG CHO CẢ THÊM MỚI VÀ SỬA) */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/50 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white border border-zinc-100 w-full max-w-lg rounded-[2.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
             <h3 className="text-2xl font-light italic mb-10">{isAddingNew ? 'Nhập hàng mới' : 'Cập nhật kho'}</h3>
             <form onSubmit={handleSaveProduct} className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tên Sản Phẩm</label>
                  <input required type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Giá (x1000 VNĐ)</label>
                    <input required type="number" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} />
                  </div>
                  <div>
                    {/* [NEW] Input nhập số lượng tồn kho — chủ shop có thể nhập thêm hàng vào kho */}
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tồn Kho (số lượng)</label>
                    <input required type="number" min="0" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.stock ?? 0} onChange={e => setEditProduct({...editProduct, stock: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Danh mục</label>
                    <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.category || ''} onChange={e => setEditProduct({...editProduct, category: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Xuất xứ</label>
                    <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.origin || ''} onChange={e => setEditProduct({...editProduct, origin: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Chất liệu</label>
                    <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.material || ''} onChange={e => setEditProduct({...editProduct, material: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Mô tả chi tiết</label>
                  <textarea className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none resize-none h-24" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setEditProduct(null)} className="flex-1 bg-zinc-100 text-[#333333] py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest">Hủy</button>
                  <button type="submit" className="flex-1 bg-[#8FA08A] text-white py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-lg shadow-[#8FA08A]/20">{isAddingNew ? 'Xác nhận nhập kho' : 'Lưu thay đổi'}</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* DETAIL MODAL (SELL VIEW) */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/70 backdrop-blur-md">
           <div className="bg-white border border-zinc-100 w-full max-w-xl rounded-[3rem] p-14 shadow-2xl relative">
              <button onClick={() => setActiveProduct(null)} className="absolute top-10 right-10 text-zinc-300 hover:text-red-500">✕</button>
              <div className="text-center font-light italic">
                  <h2 className="text-4xl mb-2">{activeProduct.name}</h2>
                  <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-4">{activeProduct.material} | {activeProduct.origin}</p>
                  <p className="text-[#8FA08A] text-2xl font-black not-italic my-8">{formatVND(activeProduct.price)}</p>
                  {/* [NEW] Hiển thị tồn kho trong modal. Disable nút Add to Cart nếu hết hàng */}
                  <div className="mb-4">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      (activeProduct.stock ?? 0) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400'
                    }`}>
                      {(activeProduct.stock ?? 0) > 0 ? `Còn ${activeProduct.stock} sản phẩm` : 'Hết hàng'}
                    </span>
                  </div>
                  {/* [LEARN] Nút chọn màu: render từ mảng COLORS bằng .map() thay vì viết tay từng nút */}
                  <div className="flex justify-center gap-4 mb-6">
                    {COLORS.map(c => <button key={c.name} onClick={() => setTempSelection(p=>({...p, color: c.name}))} className={`w-8 h-8 rounded-full ${c.class} ring-offset-4 ring-zinc-300 ${tempSelection.color === c.name ? 'ring-2' : ''}`}></button>)}
                  </div>
                  {/* [LEARN] Nút chọn size: render từ mảng SIZES bằng .map() */}
                  <div className="flex justify-center gap-3 mb-10">
                    {SIZES.map(s => (
                      <button key={s} onClick={() => setTempSelection(p=>({...p, size: s}))} className={`w-10 h-10 rounded-xl text-xs font-black uppercase transition-all ${
                        tempSelection.size === s ? 'bg-[#333333] text-white shadow-lg' : 'bg-[#F9FAFB] text-zinc-400 hover:bg-zinc-100'
                      }`}>{s}</button>
                    ))}
                  </div>
                  {/* [NEW] Disable nút nếu hết hàng — disabled:opacity-50 là Tailwind utility cho trạng thái disabled */}
                  <button
                    onClick={addToCart}
                    disabled={(activeProduct.stock ?? 0) <= 0}
                    className="w-full bg-[#333333] text-white py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-black transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#333333] disabled:active:scale-100"
                  >
                    {(activeProduct.stock ?? 0) > 0 ? 'Add to cart' : 'Hết hàng'}
                  </button>
              </div>
           </div>
        </div>
      )}
      {/* --- CHECKOUT MODAL --- */}
      {checkoutModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border border-zinc-100 flex flex-col items-center text-center">
            {checkoutModal.status === 'selecting' && (
              <>
                <h3 className="text-3xl font-light italic mb-2 text-[#333333]">Thanh toán</h3>
                <p className="text-zinc-400 text-sm mb-8">Tổng số tiền: <span className="font-bold text-[#8FA08A]">{formatVND(checkoutModal.total || total)}</span></p>
                <div className="flex gap-4 w-full">
                  <button onClick={() => processCheckout('cash')} className="flex-1 bg-[#F9FAFB] hover:bg-zinc-100 border border-zinc-100 p-6 rounded-3xl transition-all flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center text-xl">💵</div>
                    <span className="font-bold text-sm text-[#333333]">Tiền mặt</span>
                  </button>
                  <button onClick={() => processCheckout('transfer')} className="flex-1 bg-[#F9FAFB] hover:bg-emerald-50 border border-zinc-100 hover:border-emerald-100 p-6 rounded-3xl transition-all flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-xl">📱</div>
                    <span className="font-bold text-sm text-emerald-700">Chuyển khoản</span>
                  </button>
                </div>
                <button onClick={() => setCheckoutModal({isOpen: false})} className="mt-8 text-zinc-400 hover:text-zinc-600 text-xs font-bold tracking-widest uppercase">Hủy</button>
              </>
            )}

            {checkoutModal.status === 'polling' && checkoutModal.method === 'transfer' && (
              <>
                <h3 className="text-2xl font-light italic mb-2 text-[#333333]">Mã QR Thanh Toán</h3>
                <p className="text-zinc-400 text-xs mb-6 max-w-[250px] mx-auto">Vui lòng quét mã QR dưới đây bằng ứng dụng ngân hàng. Đơn hàng sẽ tự động xác nhận.</p>
                
                <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm mb-6 inline-block relative">
                  {/* [LEARN] Tích hợp SePay VietQR — Tự động điền số tài khoản, số tiền và lời nhắn là Mã Đơn */}
                  <img 
                    src={`https://qr.sepay.vn/img?acc=123456789&bank=MBBank&amount=${checkoutModal.total}&des=DH${checkoutModal.invoiceId}`} 
                    alt="VietQR" 
                    className="w-48 h-48 rounded-xl object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 border-4 border-[#8FA08A] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>

                <div className="text-[#8FA08A] font-bold text-lg mb-2">{formatVND(checkoutModal.total || total)}</div>
                <div className="text-zinc-400 text-xs flex items-center gap-2 justify-center">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Đang chờ thanh toán...
                </div>
                <button onClick={() => setCheckoutModal({isOpen: false, status: 'selecting'})} className="mt-8 text-zinc-400 hover:text-zinc-600 text-xs font-bold tracking-widest uppercase">Đóng</button>
              </>
            )}

            {checkoutModal.status === 'success' && (
              <div className="py-8">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-100">
                  ✓
                </div>
                <h3 className="text-3xl font-light italic mb-2 text-[#333333]">Thành công!</h3>
                <p className="text-zinc-400 text-sm">Thanh toán đã được xác nhận</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Default: mở app → đăng nhập ngay */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pos" element={<POSPage />} />
      {/* Super Admin System */}
      <Route path="/system" element={<SystemLogin />} />
      <Route path="/system/dashboard" element={<SystemDashboard />} />
      {/* Public Store */}
      <Route path="/store/:tenant_id" element={<PublicStore />} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
