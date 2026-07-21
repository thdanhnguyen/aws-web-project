import { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ShoppingCart, History, Clock, LayoutDashboard,
  Package, Users, LogOut, Search, Plus, Minus, X,
  Loader2, PanelLeftOpen, PanelLeftClose, UserSquare
} from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicStore from './pages/PublicStore';
import SystemLogin from './pages/SystemLogin';
import SystemDashboard from './pages/SystemDashboard';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const bankId = import.meta.env.VITE_BANK_ID || 'TPBank';
const bankAcc = import.meta.env.VITE_BANK_ACC || '00001234567';

const COLORS = [
  { name: 'Black', hex: '#000000', class: 'bg-black' },
  { name: 'White', hex: '#ffffff', class: 'bg-white border border-zinc-200' },
  { name: 'Grey', hex: '#71717a', class: 'bg-zinc-400' }
];

const SIZES = ['S', 'M', 'L', 'XL'];

const formatVND = (amount: any) => {
  const value = parseFloat(amount); 
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
  const [activeView, setActiveView] = useState<'dashboard' | 'sell' | 'history' | 'warehouse' | 'shift' | 'staff' | 'customers'>('sell');
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
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

  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ email: '', password: '', full_name: '' });
  const [allShifts, setAllShifts] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();


  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'Paid' | 'Unpaid'>('all');


  const [customerInput, setCustomerInput] = useState({ name: '', email: '' });
  
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean,
    status: 'payment' | 'transfer-qr' | 'receipt';
    method?: 'cash' | 'transfer';
    invoiceId?: string;
    total?: number;
    cashGiven?: number;
    receiptData?: any;
  }>({ isOpen: false, status: 'payment' });
  const [cashGivenInput, setCashGivenInput] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const navItems = [
          { view: 'sell', adminOnly: false },
          { view: 'history', adminOnly: false },
          { view: 'shift', adminOnly: false },
          { view: 'dashboard', adminOnly: true },
          { view: 'warehouse', adminOnly: true },
          { view: 'staff', adminOnly: true },
          { view: 'customers', adminOnly: true },
        ].filter(item => !item.adminOnly || user?.role === 'admin');

        const key = parseInt(e.key);
        if (!isNaN(key) && key >= 1 && key <= navItems.length) {
          e.preventDefault();
          setActiveView(navItems[key - 1].view as any);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery) return products;
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    return products.filter((p: any) => p.name.toLowerCase().includes(lowerQuery) || (p.price && p.price.toString().includes(lowerQuery)));
  }, [debouncedQuery, products]);

  // 📊 Computed on-the-fly for history view fallback
  const totalRevenue = useMemo(() => history.reduce((sum, item) => sum + parseFloat(item.total_amount), 0), [history]);
  const totalOrders = history.length;

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

  const fetchDashboardStats = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/dashboard/stats`);
    const payload = await res.json();
    if (payload.success) setDashboardStats(payload.data);
  }, [fetchWithAuth]);

  const fetchCustomers = useCallback(async () => {
    const res = await fetchWithAuth(`${API_URL}/customers`);
    const payload = await res.json();
    if (payload.success) setCustomers(payload.data);
  }, [fetchWithAuth]);

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    refreshAccessToken().then(async (token) => {
      if (token) {
        fetchProducts(token);
        // Kiểm tra ca hiện tại — nếu chưa có ca VÀ không phải admin, chuyển vào view Ca Làm
        const shift = await fetchCurrentShift();
        const u = JSON.parse(localStorage.getItem('pos_user') || '{}');
        if (!shift && u.role !== 'admin') setActiveView('shift');
        else setActiveView('sell');
      }
      setLoading(false);
    });
  }, [refreshAccessToken, fetchProducts, fetchCurrentShift]);

  useEffect(() => {
    if (activeView === 'history' || activeView === 'dashboard') fetchHistory();
    if (activeView === 'warehouse' || activeView === 'sell') fetchProducts();
    if (activeView === 'dashboard') fetchDashboardStats();
    if (activeView === 'customers') fetchCustomers();
    if (activeView === 'shift') {
      fetchCurrentShift();
      // fetchAllShifts chỉ gọi cho admin — staff không có quyền
      const u = JSON.parse(localStorage.getItem('pos_user') || '{}');
      if (u.role === 'admin') fetchAllShifts();
    }
    if (activeView === 'staff') fetchStaff();
    setSearchQuery('');
  }, [activeView, fetchHistory, fetchProducts, fetchCurrentShift, fetchStaff, fetchAllShifts, fetchDashboardStats, fetchCustomers]);

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
    if (cart.length === 0) return toast.error('Giỏ hàng trống');
    setCashGivenInput('');
    setCheckoutModal({ isOpen: true, status: 'payment', total: subtotal + tax });
  };

  const processCheckout = async (method: 'cash' | 'transfer') => {
    const payloadItems = cart.map(item => ({
      product_id: item.id, quantity: item.quantity, color: item.color, size: item.size
    }));
    const cashGiven = parseFloat(cashGivenInput) || 0;
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
      fetchHistory();
      if (method === 'cash') {
        setCheckoutModal(prev => ({
          ...prev, method, status: 'receipt',
          invoiceId: data.receipt?.id,
          cashGiven,
          receiptData: { ...data.receipt, cartSnapshot: cart, cashGiven, customerInput }
        }));
      } else {
        setCheckoutModal(prev => ({ ...prev, method, status: 'transfer-qr', invoiceId: data.receipt?.id }));
      }
    } else {
      toast.error(data.error || data.message || 'Thanh toán thất bại');
    }
  };

  const handleSendReceiptEmail = async () => {
    if (!checkoutModal.invoiceId || !customerInput.email) {
      toast.error('Vui lòng nhập email khách hàng để gửi hóa đơn!');
      return;
    }
    toast.success('Đã gửi hóa đơn đến email: ' + customerInput.email);
    setCart([]);
    setCustomerInput({ name: '', email: '' });
    setCheckoutModal({ isOpen: false, status: 'payment' });
  };

  const handleCloseReceipt = () => {
    setCart([]);
    setCustomerInput({ name: '', email: '' });
    setCheckoutModal({ isOpen: false, status: 'payment' });
  };

  // Polling trạng thái chuyển khoản
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (checkoutModal.isOpen && checkoutModal.status === 'transfer-qr' && checkoutModal.invoiceId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/transactions/${checkoutModal.invoiceId}/status`);
          const data = await res.json();
          if (data.success && data.payment_status === 'Paid') {
            clearInterval(interval);
            setCheckoutModal(prev => ({ ...prev, status: 'receipt', receiptData: { ...data, cartSnapshot: cart, customerInput } }));
            toast.success('Chuyển khoản xác nhận thành công!');
          }
        } catch (e) { console.error('Polling error', e); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [checkoutModal.status, checkoutModal.invoiceId]);

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
    setConfirmDialog({
      isOpen: true,
      message: 'Xác nhận đóng ca làm việc?',
      onConfirm: async () => {
        setConfirmDialog(null);
        const res = await fetchWithAuth(`${API_URL}/shifts/close`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          toast.success('Đóng ca thành công!');
          setCurrentShift(null);
          setAllShifts(prev => [data.data, ...prev]);
        } else {
          toast.error(data.error || 'Lỗi đóng ca');
        }
      }
    });
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
    setConfirmDialog({
      isOpen: true,
      message: 'Xóa nhân viên này?',
      onConfirm: async () => {
        setConfirmDialog(null);
        const res = await fetchWithAuth(`${API_URL}/auth/staff/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { toast.success('Đã xóa nhân viên'); fetchStaff(); }
        else toast.error(data.error || 'Lỗi xóa nhân viên');
      }
    });
  };

  if (loading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center font-inter uppercase tracking-widest text-zinc-400 text-xs"><Loader2 className="animate-spin mr-2" size={16} />Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#333333] font-inter flex overflow-hidden w-full">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-white border-r border-zinc-100 flex flex-col py-4 shrink-0 shadow-sm z-50 transition-all duration-300 ease-in-out overflow-hidden`}
      >
        {/* Logo + Toggle */}
        <div className="flex items-center justify-between px-3 pt-2 pb-6">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="MEKIE" className="w-9 h-9 rounded-xl shrink-0 shadow-md" />
            {sidebarOpen && (
              <h1 className="text-base font-black tracking-tighter whitespace-nowrap">
                <span className="text-[#4285F4]">M</span>
                <span className="text-[#EA4335]">E</span>
                <span className="text-[#FBBC05]">K</span>
                <span className="text-[#4285F4]">I</span>
                <span className="text-[#34A853]">E</span>
                <span className="text-zinc-400 ml-1 font-medium">POS</span>
              </h1>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            aria-label={sidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
            aria-expanded={sidebarOpen}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-[#8FA08A] outline-none"
          >
            {sidebarOpen
              ? <PanelLeftClose size={16} aria-hidden="true" />
              : <PanelLeftOpen size={16} aria-hidden="true" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2 px-2" aria-label="Main navigation">
          {([
            { view: 'sell',      icon: <ShoppingCart size={18} />, label: 'Bán Hàng',   ariaLabel: 'Bán hàng',            adminOnly: false },
            { view: 'history',   icon: <History size={18} />,     label: 'Lịch Sử',    ariaLabel: 'Lịch sử giao dịch',   adminOnly: false },
            { view: 'shift',     icon: <Clock size={18} />,       label: 'Ca Làm',      ariaLabel: 'Quản lý ca làm',      adminOnly: false },
            { view: 'warehouse', icon: <Package size={18} />,    label: 'Sản Phẩm',    ariaLabel: 'Xem danh sách sản phẩm', adminOnly: false },
            { view: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Tổng Quan', ariaLabel: 'Tổng quan doanh thu', adminOnly: true },
            { view: 'customers', icon: <UserSquare size={18} />, label: 'Khách Hàng', ariaLabel: 'Quản lý khách hàng', adminOnly: true },
            { view: 'staff',     icon: <Users size={18} />,       label: 'Nhân Viên',   ariaLabel: 'Quản lý nhân viên',   adminOnly: true },
          ] as const).filter(item => !item.adminOnly || user?.role === 'admin').map((item, index) => (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view as any)}
              aria-label={`${item.ariaLabel} (Phím tắt: Ctrl+${index + 1})`}
              aria-current={activeView === item.view ? 'page' : undefined}
              title={!sidebarOpen ? `${item.label} (Ctrl+${index + 1})` : undefined}
              className={`w-full flex items-center gap-3 p-3 min-h-[48px] rounded-xl transition-all font-semibold relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#8FA08A] ${
                activeView === item.view
                  ? 'bg-[#F0F4F0] text-[#4A5D45]'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
              }`}
            >
              {/* Active Indicator: a subtle left border/bar inside the button */}
              {activeView === item.view && (
                 <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#4A5D45] rounded-r-full" aria-hidden="true" />
              )}
              <span aria-hidden="true" className={`shrink-0 ${activeView === item.view ? 'ml-1' : 'ml-0'} transition-all`}>{item.icon}</span>
              {sidebarOpen && (
                <span className="uppercase text-[10px] tracking-widest whitespace-nowrap">{item.label}</span>
              )}
              {item.view === 'shift' && currentShift && sidebarOpen && (
                <span aria-hidden="true" className="ml-auto w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"></span>
              )}
              {item.view === 'shift' && currentShift && !sidebarOpen && (
                <span aria-hidden="true" className="absolute right-2 top-2 w-2 h-2 bg-emerald-400 rounded-full"></span>
              )}
              {sidebarOpen && (
                <span className="ml-auto text-[9px] text-zinc-400 font-medium tracking-tighter" aria-hidden="true">Ctrl+{index + 1}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-zinc-100 px-2 pt-4 pb-2">
          {sidebarOpen && (
            <div className="px-2 mb-3">
              <div className="text-[10px] text-zinc-300 font-bold tracking-widest truncate">{user?.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#8FA08A] text-xs font-black truncate">{user?.full_name || user?.tenant_id}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  user?.role === 'admin' ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'
                }`}>{user?.role}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title={!sidebarOpen ? 'Đăng xuất' : undefined}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-all"
          >
            <LogOut size={16} aria-hidden="true" className="shrink-0" />
            {sidebarOpen && <span className="text-[10px] uppercase font-bold tracking-widest">Đăng xuất</span>}
          </button>
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
                  Đóng Ca
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] p-12 border border-zinc-100 shadow-soft">
                <h3 className="text-2xl font-light italic mb-8">Mở ca mới</h3>
                <form onSubmit={handleOpenShift} className="space-y-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tiền mặt đầu ca (VNĐ)</label>
                    <input type="number" min="0" placeholder="VD: 2000000" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-4 text-sm focus:border-[#8FA08A] outline-none" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
                  </div>
                  <button type="submit" className="w-full bg-[#8FA08A] text-white py-5 rounded-2xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-[#8FA08A]/20 hover:shadow-xl transition-all">
                    Mở Ca
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
        {activeView === 'dashboard' && dashboardStats && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
             <header className="mb-14"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Tổng Quan</h2></header>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">
                <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-soft relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-[#8FA08A] mb-4">Tổng Doanh Thu</div>
                   <div className="text-3xl font-black">{formatVND(dashboardStats.totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-[3rem] p-10 border border-zinc-100 shadow-soft relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-4">Tổng Đơn Hàng</div>
                   <div className="text-3xl font-black">{dashboardStats.totalOrders} <span className="text-xs uppercase text-zinc-400 tracking-normal ml-1">đơn</span></div>
                </div>
                <div className="bg-[#333333] text-white rounded-[3rem] p-10 border border-zinc-800 shadow-xl relative overflow-hidden flex flex-col justify-center">
                   <div className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-4">Giá Trị Trung Bình</div>
                   <div className="text-3xl font-black text-[#8FA08A]">{formatVND(dashboardStats.totalOrders > 0 ? dashboardStats.totalRevenue / dashboardStats.totalOrders : 0)}</div>
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-light italic mb-8">Giao Dịch Gần Đây</h3>
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

        {/* VIEW: CUSTOMERS */}
        {activeView === 'customers' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <header className="mb-14"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Khách Hàng</h2></header>
            <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-soft overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-widest font-black text-zinc-400">
                    <tr><th className="p-8">Tên Khách Hàng</th><th className="p-8">Email</th><th className="p-8">Điện Thoại</th><th className="p-8 text-right">Ngày Tạo</th></tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-50">
                    {customers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-8 font-bold">{c.name}</td>
                        <td className="p-8 text-zinc-400">{c.email || '—'}</td>
                        <td className="p-8 text-zinc-400">{c.phone || '—'}</td>
                        <td className="p-8 text-right text-zinc-400">{formatVietnamTime(c.created_at)}</td>
                      </tr>
                    ))}
                    {customers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-zinc-400 italic text-xs">Chưa có khách hàng</td></tr>}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* VIEW: SELL (POS) */}
        {activeView === 'sell' && !currentShift && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center h-full max-w-md mx-auto text-center mt-20">
             <div className="w-24 h-24 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6 shadow-sm mx-auto">
               <Clock size={48} aria-hidden="true" />
             </div>
             <h2 className="text-3xl font-light italic mb-4">Chưa Mở Ca</h2>
             <p className="text-sm text-zinc-500 mb-8 leading-relaxed">Bạn cần mở ca trước khi bán hàng.</p>
             <button onClick={() => setActiveView('shift')} className="bg-[#8FA08A] text-white px-8 py-4 rounded-2xl uppercase text-[10px] font-black tracking-widest shadow-lg shadow-[#8FA08A]/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
               Mở Ca
             </button>
          </div>
        )}

        {activeView === 'sell' && currentShift && (
          <div className="animate-in fade-in duration-500 flex flex-col xl:flex-row h-full gap-6 lg:gap-10">
            <div className="flex-1">
                <header className="mb-10 lg:mb-14 border-b border-zinc-100 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                   <h2 className="text-5xl font-light italic text-[#333333]">Sản Phẩm</h2>
                   <label htmlFor="search-sell" className="sr-only">Tìm sản phẩm theo tên</label>
                   <div className="relative w-full lg:w-72">
                     <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                     <input 
                        id="search-sell"
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        aria-label="Tìm sản phẩm theo tên"
                        className="pl-10 bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-sm w-full font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                   </div>
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
                 <h3 className="text-2xl font-light italic mb-6">Giỏ Hàng</h3>
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
                            aria-label={`Giảm số lượng ${item.name}`}
                            onClick={() => setCart(c => c.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                            className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center"
                          ><Minus size={14} aria-hidden="true" /></button>
                          <span aria-live="polite" aria-label={`Số lượng ${item.name}: ${item.quantity}`} className="w-6 text-center text-xs font-black">{item.quantity}</span>
                          <button
                            aria-label={`Tăng số lượng ${item.name}`}
                            onClick={() => setCart(c => c.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))}
                            className="w-11 h-11 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors flex items-center justify-center"
                          ><Plus size={14} aria-hidden="true" /></button>
                        </div>
                        <span className="font-bold text-xs shrink-0 w-16 text-right">{formatVND(parseFloat(item.price) * item.quantity)}</span>
                        <button aria-label={`Xóa ${item.name} khỏi giỏ hàng`} onClick={() => setCart(c => c.filter((_, i) => i !== idx))} className="w-11 h-11 flex items-center justify-center text-zinc-300 hover:text-red-400 transition-colors shrink-0"><X size={14} aria-hidden="true" /></button>
                      </div>
                    ))}
                    {cart.length === 0 && <p className="text-center text-zinc-300 text-xs italic py-8">Chưa có sản phẩm</p>}
                 </div>

                 {/* [NEW] Form nhập thông tin khách hàng cho cashier
                     Trước đây hard-code 'khachang@demo.com', bây giờ cashier có thể nhập tên/email thật */}
                 <div className="border-t border-zinc-50 pt-6 mb-4 space-y-3">
                    <label htmlFor="cashier-customer-name" className="sr-only">Tên khách hàng</label>
                    <input
                      id="cashier-customer-name"
                      type="text" placeholder="Tên khách hàng"
                     className="w-full bg-[#F9FAFB] rounded-xl px-4 py-3 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                     value={customerInput.name}
                     onChange={e => setCustomerInput(p => ({...p, name: e.target.value}))}
                   />
                    <label htmlFor="cashier-customer-email" className="sr-only">Email (tùy chọn)</label>
                    <input
                      id="cashier-customer-email"
                      type="email" placeholder="Email (tùy chọn)"
                     className="w-full bg-[#F9FAFB] rounded-xl px-4 py-3 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                     value={customerInput.email}
                     onChange={e => setCustomerInput(p => ({...p, email: e.target.value}))}
                   />
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-xs text-zinc-400"><span>Tạm tính</span><span className="font-bold">{formatVND(subtotal)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400"><span>Thuế (10%)</span><span className="font-bold">{formatVND(tax)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400 pt-3 border-t border-zinc-50"><span>Tổng tiền</span><span className="text-xl font-black text-[#8FA08A]">{formatVND(total)}</span></div>
                    <button onClick={handleOpenCheckoutModal} className="w-full bg-[#8FA08A] text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-[#8FA08A]/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Thanh toán</button>
                 </div>
            </div>
          </div>
        )}

        {/* VIEW: HISTORY — read-only cho cả admin và staff */}
        {activeView === 'history' && (() => {
          const filteredHistory = history.filter(h => historyFilter === 'all' || h.payment_status === historyFilter);
          return (
          <div className="animate-in slide-in-from-right-10 duration-500">
            <header className="mb-10 flex flex-col lg:flex-row justify-between lg:items-end gap-6">
              <h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Lịch Sử</h2>
              <div className="flex items-center gap-2">
                {(['all','Paid','Unpaid'] as const).map(f => (
                  <button key={f} onClick={() => setHistoryFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      historyFilter === f ? 'bg-[#333333] text-white' : 'bg-white border border-zinc-100 text-zinc-400 hover:border-zinc-300'
                    }`}>
                    {f === 'all' ? 'Tất cả' : f === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                  </button>
                ))}
              </div>
            </header>
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-soft overflow-x-auto">
              <table className="w-full text-left" role="table">
                <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                  <tr>
                    <th scope="col" className="p-6 lg:p-8">Mã Đơn</th>
                    <th scope="col" className="p-6 lg:p-8">Khách Hàng</th>
                    <th scope="col" className="p-6 lg:p-8">Thời Gian</th>
                    <th scope="col" className="p-6 lg:p-8">Trạng Thái</th>
                    <th scope="col" className="p-6 lg:p-8 text-right">Tổng Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-sm">
                  {filteredHistory.map((h, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-6 lg:p-8 font-bold text-[#8FA08A]"># {h.id}</td>
                      <td className="p-6 lg:p-8">{h.customer_name || 'Khách vãng lai'}</td>
                      <td className="p-6 lg:p-8 text-zinc-400">{formatVietnamTime(h.created_at || h.create_at)}</td>
                      <td className="p-6 lg:p-8">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          h.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                        }`}>{h.payment_status || 'Unpaid'}</span>
                      </td>
                      <td className="p-6 lg:p-8 text-right font-black">{formatVND(h.total_amount)}</td>
                    </tr>
                  ))}
                  {filteredHistory.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-zinc-400 italic text-xs" aria-live="polite">Không có giao dịch nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          );
        })()}

        {/* VIEW: WAREHOUSE — Admin: đầy đủ tính năng | Staff: read-only tra cứu */}
        {activeView === 'warehouse' && user?.role === 'admin' && (
           <div className="animate-in slide-in-from-bottom-10 duration-500">
             <header className="mb-14 flex flex-col lg:flex-row justify-between lg:items-end gap-6">
                <h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Kho Hàng</h2>
               <div className="relative w-full lg:w-80">
                 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                 <input
                    id="search-warehouse"
                    type="text"
                    placeholder="Tìm sản phẩm trong kho..."
                    aria-label="Tìm sản phẩm trong kho"
                    className="pl-10 bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-sm w-full font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
             </header>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-soft flex justify-between items-center group">
                    <div className="flex gap-6 items-center">
                        <div>
                          <h4 className="font-bold text-lg">{p.name}</h4>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{p.category} | {p.material} | {p.origin}</p>
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
                   <Plus size={36} className="mb-4 group-hover:scale-125 transition-transform" aria-hidden="true" />
                   <span className="text-[10px] uppercase font-black tracking-widest">Thêm sản phẩm mới</span>
                </button>
             </div>
           </div>
        )}

        {/* VIEW: WAREHOUSE — Staff: Read-Only tra cứu sản phẩm & tồn kho */}
        {activeView === 'warehouse' && user?.role !== 'admin' && (
          <div className="animate-in slide-in-from-bottom-10 duration-500">
            <header className="mb-10 flex flex-col lg:flex-row justify-between lg:items-end gap-6">
              <div>
                <h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Sản Phẩm</h2>
                <p className="text-xs text-zinc-400 mt-2 uppercase tracking-widest">Chế độ xem — chỉ đọc</p>
              </div>
              <div className="relative w-full lg:w-80">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                <input
                  id="search-products-readonly"
                  type="text"
                  placeholder="Tìm theo tên sản phẩm..."
                  aria-label="Tìm sản phẩm trong kho"
                  className="pl-10 bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-sm w-full font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </header>
            <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-soft overflow-x-auto">
              <table className="w-full text-left" role="table">
                <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400">
                  <tr>
                    <th scope="col" className="p-6">Tên Sản Phẩm</th>
                    <th scope="col" className="p-6">Danh Mục</th>
                    <th scope="col" className="p-6 text-right">Giá Bán</th>
                    <th scope="col" className="p-6 text-center">Tồn Kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 text-sm" aria-live="polite">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-6">
                        <p className="font-bold">{p.name}</p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-0.5">{p.material} · {p.origin}</p>
                      </td>
                      <td className="p-6 text-zinc-500">{p.category || '—'}</td>
                      <td className="p-6 text-right font-black text-[#8FA08A]">{formatVND(p.price)}</td>
                      <td className="p-6 text-center">
                        {(p.stock ?? 0) > 0 ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700"
                            aria-label={`Còn ${p.stock} sản phẩm`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                            {p.stock}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-500"
                            aria-label="Hết hàng"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" aria-hidden="true" />
                            Hết hàng
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-zinc-400 italic text-xs" aria-live="polite">
                        Không có sản phẩm nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ĐA NĂNG (DÙNG CHO CẢ THÊM MỚI VÀ SỬA) */}
      {editProduct && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-product-title" className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/50 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-white border border-zinc-100 w-full max-w-lg rounded-[2.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500">
             <h3 id="modal-product-title" className="text-2xl font-light italic mb-10">{isAddingNew ? 'Nhập hàng mới' : 'Cập nhật kho'}</h3>
             <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Tên Sản Phẩm</label>
                    <input required type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Mã SKU</label>
                    <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.sku || ''} onChange={e => setEditProduct({...editProduct, sku: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Giá (VNĐ)</label>
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
        <div role="dialog" aria-modal="true" aria-labelledby="modal-product-detail-title" className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/70 backdrop-blur-md">
           <div className="bg-white border border-zinc-100 w-full max-w-xl rounded-[3rem] p-14 shadow-2xl relative">
              <button aria-label="Đóng chi tiết sản phẩm" onClick={() => setActiveProduct(null)} className="absolute top-10 right-10 w-11 h-11 flex items-center justify-center text-zinc-300 hover:text-red-500"><X size={18} aria-hidden="true" /></button>
              <div className="text-center font-light italic">
                  <h2 id="modal-product-detail-title" className="text-4xl mb-2">{activeProduct.name}</h2>
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
                    {(activeProduct.stock ?? 0) > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
                  </button>
              </div>
           </div>
        </div>
      )}
      {/* --- CHECKOUT MODAL --- */}
      {checkoutModal.isOpen && (() => {
        const totalAmt = checkoutModal.total || total;
        const cashGivenNum = parseFloat(cashGivenInput) || 0;
        const change = Math.max(0, cashGivenNum - totalAmt);
        const rd = checkoutModal.receiptData;

        /* ── SCREEN 1: PAYMENT (IMAGE 1) ── */
        if (checkoutModal.status === 'payment') return (
          <div role="dialog" aria-modal="true" aria-labelledby="modal-checkout-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl rounded-[2rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col lg:flex-row max-h-[90vh] overflow-y-auto">
              
              {/* LEFT COLUMN: CUSTOMER & METHODS */}
              <div className="flex-1 p-8 lg:p-12 space-y-10">
                <div>
                  <h3 id="modal-checkout-title" className="text-xl font-bold text-[#333333] mb-6">Thông tin khách hàng</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <label htmlFor="checkout-email" className="sr-only">Email khách hàng</label>
                    <input
                      id="checkout-email"
                      type="email" placeholder="Email khách hàng"
                      aria-label="Email khách hàng"
                      className="w-full bg-[#F9FAFB] rounded-xl px-5 py-4 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                      value={customerInput.email} 
                      onChange={e => setCustomerInput(p => ({...p, email: e.target.value}))}
                    />
                    <label htmlFor="checkout-name" className="sr-only">Tên khách hàng</label>
                    <input
                      id="checkout-name"
                      type="text" placeholder="Tên khách hàng"
                      aria-label="Tên khách hàng"
                      className="w-full bg-[#F9FAFB] rounded-xl px-5 py-4 text-sm outline-none border border-zinc-100 focus:border-[#8FA08A]"
                      value={customerInput.name}
                      onChange={e => setCustomerInput(p => ({...p, name: e.target.value}))}
                    />
                    <div className="text-xs text-zinc-400">Điểm tích lũy: 0</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#333333] mb-6">Phương thức thanh toán</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'cash', label: 'Tiền mặt', icon: '💵' },
                      { key: 'transfer', label: 'Chuyển khoản', icon: '🏦' },
                    ].map(m => (
                      <button
                        key={m.key}
                        onClick={() => setCheckoutModal(prev => ({ ...prev, method: m.key as any }))}
                        className={`w-full flex items-center justify-center p-5 rounded-xl border-2 transition-all font-bold text-sm
                          ${checkoutModal.method === m.key
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-zinc-50 bg-[#F9FAFB] text-zinc-500 hover:border-zinc-100'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: BILLING & CASH */}
              <div className="w-full lg:w-[450px] bg-white p-8 lg:p-12 border-l border-zinc-100 flex flex-col">
                 <h3 className="text-xl font-bold text-[#333333] mb-8">Thông tin thanh toán</h3>
                 
                 <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-zinc-500 font-bold"><span>Tổng tiền</span><span>{formatVND(totalAmt)}</span></div>
                    <div className="flex justify-between text-red-500 font-bold"><span>Giảm giá</span><span>- 0 ₫</span></div>
                    <div className="flex justify-between text-blue-500 font-bold"><span>Giảm từ điểm</span><span>- 0 ₫</span></div>
                    <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                       <span className="font-bold text-lg text-[#333333]">Cần trả</span>
                       <span className="text-2xl font-black text-[#333333]">{formatVND(totalAmt)}</span>
                    </div>
                 </div>

                 {checkoutModal.method === 'cash' && (
                   <div className="space-y-6 flex-1">
                      <div>
                        <p className="text-sm font-bold text-zinc-600 mb-2">Khách đưa</p>
                        <input
                          type="number"
                          placeholder="0"
                          value={cashGivenInput}
                          onChange={e => setCashGivenInput(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-3 text-lg font-bold text-[#333333] outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000].map(v => (
                          <button key={v} onClick={() => setCashGivenInput(String((parseFloat(cashGivenInput) || 0) + v))}
                            className="bg-white border border-zinc-100 hover:bg-blue-50 p-3 rounded text-xs font-bold text-zinc-600 transition-all shadow-sm">
                            {new Intl.NumberFormat('vi-VN').format(v)} ₫
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                         <button onClick={() => setCashGivenInput(String(Math.ceil(totalAmt)))} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">Tiền chẵn</button>
                         <button onClick={() => setCashGivenInput('')} className="flex-1 bg-red-500 text-white py-3 rounded font-bold text-sm">Xóa</button>
                      </div>

                      <div className="flex justify-between items-center pt-4">
                         <span className="text-[#333333] font-bold text-sm">Tiền thừa</span>
                         <span className={`text-xl font-black ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatVND(change)}
                         </span>
                      </div>
                   </div>
                 )}

                 <div className="mt-auto pt-8 space-y-3">
                    <button
                      onClick={() => checkoutModal.method && processCheckout(checkoutModal.method)}
                      disabled={!checkoutModal.method || (checkoutModal.method === 'cash' && cashGivenNum < totalAmt)}
                      className="w-full bg-green-600 text-white font-bold py-4 rounded-lg uppercase tracking-wider text-sm shadow-lg active:scale-95 transition-all disabled:opacity-40"
                    >
                      Xác nhận thanh toán
                    </button>
                    <button onClick={() => setCheckoutModal({ isOpen: false, status: 'payment' })} className="w-full bg-zinc-300 text-zinc-600 font-bold py-4 rounded-lg uppercase tracking-wider text-sm transition-all">
                      Quay lại POS
                    </button>
                 </div>
              </div>
            </div>
          </div>
        );

        /* ── SCREEN 2: QR TRANSFER ── */
        if (checkoutModal.status === 'transfer-qr') return (
          <div role="dialog" aria-modal="true" aria-labelledby="modal-qr-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl p-10 shadow-2xl border border-zinc-100 flex flex-col items-center text-center">
              <h3 id="modal-qr-title" className="text-xl font-bold text-[#333333] mb-1">Mã QR Thanh Toán</h3>
              <p className="text-zinc-400 text-xs mb-8">Vui lòng quét mã dưới đây</p>
              
              <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm mb-6">
                <img src={`https://qr.sepay.vn/img?acc=${bankAcc}&bank=${bankId}&amount=${totalAmt}&des=DH${checkoutModal.invoiceId}`}
                  alt="VietQR" className="w-48 h-48 rounded-lg object-cover" />
              </div>
              
              <div className="text-2xl font-black text-[#8FA08A] mb-4">{formatVND(totalAmt)}</div>
              
              <div className="flex items-center gap-2 text-zinc-400 text-xs mb-6">
                <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Đang chờ thanh toán...
              </div>
              
              <button onClick={() => setCheckoutModal({ isOpen: false, status: 'payment' })} className="mt-8 text-zinc-400 hover:text-zinc-600 text-xs font-bold tracking-widest uppercase">Đóng</button>
            </div>
          </div>
        );

        /* ── SCREEN 3: THERMAL RECEIPT (IMAGE 3) ── */
        if (checkoutModal.status === 'receipt') {
          const snap = rd?.cartSnapshot || cart;
          const now = new Date();
          const dateStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
          
          return (
            <div role="dialog" aria-modal="true" aria-labelledby="modal-receipt-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col items-center p-6">
                <h3 id="modal-receipt-title" className="text-lg font-bold text-[#333333] mb-4">Invoice Preview</h3>
                <div className="bg-white w-full border border-zinc-100 shadow-inner p-8 text-zinc-800 font-mono text-[10px] leading-relaxed overflow-y-auto max-h-[60vh]" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  
                  {/* Shop Header */}
                  <div className="text-center mb-6">
                    <p className="font-bold text-sm uppercase">{user?.tenant_id || 'DANG CAP STORE'}</p>
                    <p>Hotline: 0123 456 789</p>
                    <div className="my-2 border-b border-dashed border-zinc-300"></div>
                  </div>

                  {/* Order Info */}
                  <div className="mb-4 space-y-1">
                    <div>Date: {dateStr}</div>
                    <div>Customer: {rd?.customerInput?.name || customerInput.name || 'Khách vãng lai'}</div>
                    <div className="my-2 border-b border-dashed border-zinc-300"></div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 mb-4">
                    {snap.map((item: any, i: number) => (
                      <div key={i}>
                        <div className="flex justify-between font-bold">
                           <span>{item.name || item.product_name}</span>
                           <span>{new Intl.NumberFormat('vi-VN').format(parseFloat(item.price) * item.quantity)}</span>
                        </div>
                        <div className="text-[8px] text-zinc-500">
                           {item.quantity} x {new Intl.NumberFormat('vi-VN').format(parseFloat(item.price))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="my-2 border-b border-dashed border-zinc-300"></div>

                  {/* Totals */}
                  <div className="space-y-1 mb-6">
                    <div className="flex justify-between"><span>Total</span><span>{formatVND(totalAmt)}</span></div>
                    <div className="flex justify-between text-red-500"><span>Discount</span><span>-0 ₫</span></div>
                    <div className="flex justify-between font-bold text-xs pt-1 mt-1 border-t border-zinc-300">
                       <span>Final</span><span>{formatVND(totalAmt)}</span>
                    </div>
                    {checkoutModal.method === 'cash' && (
                      <div className="pt-2">
                        <div className="flex justify-between"><span>Cash</span><span>{formatVND(checkoutModal.cashGiven || 0)}</span></div>
                        <div className="flex justify-between"><span>Change</span><span>{formatVND(change)}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-4 border-t border-dashed border-zinc-300">
                    <p className="text-[8px]">Txn: TXN-{checkoutModal.invoiceId}</p>
                    <p className="text-[8px]">Staff: {user?.full_name || '101002'}</p>
                    <div className="my-4"></div>
                    <p>Thank you</p>
                    <p>See you again!</p>
                  </div>
                </div>

                {/* MODAL ACTIONS */}
                <div className="w-full flex gap-3 mt-6">
                  <button onClick={handleCloseReceipt} className="flex-1 bg-white border border-zinc-200 text-zinc-600 py-3 rounded-lg text-xs font-bold transition-all">
                    Bỏ qua
                  </button>
                  <button onClick={handleSendReceiptEmail} className="flex-1 bg-[#333333] text-white py-3 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                    <span>📠</span> In hóa đơn
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* CONFIRM DIALOG (thay thế window.confirm) */}
      {confirmDialog?.isOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full shadow-2xl border border-zinc-100 text-center">
            <p id="confirm-dialog-title" className="text-base font-bold text-[#333333] mb-8">{confirmDialog.message}</p>
            <div className="flex gap-4">
              <button
                aria-label="Hủy bỏ"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-zinc-200 transition-all"
              >Hủy</button>
              <button
                aria-label="Xác nhận"
                onClick={confirmDialog.onConfirm}
                className="flex-1 bg-[#333333] text-white py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-black transition-all"
              >Xác nhận</button>
            </div>
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
