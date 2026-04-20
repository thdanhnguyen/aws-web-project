import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Discovery from './pages/Discovery';
import PublicStore from './pages/PublicStore';

const API_URL = 'http://localhost:5000/api';

const COLORS = [
  { name: 'Black', hex: '#000000', class: 'bg-black' },
  { name: 'White', hex: '#ffffff', class: 'bg-white border border-zinc-200' },
  { name: 'Grey', hex: '#71717a', class: 'bg-zinc-400' }
];
const SIZES = ['S', 'M', 'L', 'XL'];

const formatVND = (amount: any) => {
  const value = parseFloat(amount) * 1000; 
  if (isNaN(value)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

function POSPage() {
  const [activeView, setActiveView] = useState<'sell' | 'history' | 'warehouse'>('sell');
  const [products, setProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]); 
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null); // Dùng chung cho cả Thêm mới và Sửa
  const [isAddingNew, setIsAddingNew] = useState(false); // Flag để phân biệt Thêm/Sửa
  const [tempSelection, setTempSelection] = useState({ color: 'Black', size: 'S' });
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    if (res.status === 403 || res.status === 401) {
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

  useEffect(() => {
    const storedUser = localStorage.getItem('pos_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    refreshAccessToken().then((token) => {
      if (token) fetchProducts(token);
      setLoading(false);
    });
  }, [refreshAccessToken, fetchProducts]);

  useEffect(() => {
    if (activeView === 'history') fetchHistory();
    if (activeView === 'warehouse' || activeView === 'sell') fetchProducts();
  }, [activeView, fetchHistory, fetchProducts]);

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
    setEditProduct({ name: '', price: 0, description: '', material: 'Cotton', origin: 'Vietnam' });
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

  const handelCheckout = async () =>{
    if(cart.length === 0) return toast.error("Giỏ hàng trống");
    const payloadItems = cart.map(item => ({
      product_id: item.id, quantity: item.quantity, color: item.color, size: item.size
    }));
    const res = await fetchWithAuth(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_email: 'khachang@demo.com', items: payloadItems })
    });
    const data = await res.json();
    if(data.success){
      toast.success("Thanh toán thành công!");
      setCart([]);
      fetchHistory();
    } else {
      toast.error("Thanh toán thất bại");
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  if (loading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center font-outfit uppercase tracking-widest text-zinc-400 text-xs">Authenticating...</div>

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#333333] font-outfit flex overflow-hidden w-full">
      {/* Sidebar (Duy trì tính nhất quán) */}
      <aside className="w-20 lg:w-64 bg-white border-r border-zinc-100 flex flex-col p-4 shrink-0 shadow-sm">
        <div className="flex items-center mb-10 px-2 pt-4">
          <div className="w-10 h-10 bg-[#8FA08A] rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-lg shadow-[#8FA08A]/10">
             <span className="text-white font-black">M</span>
          </div>
          <h1 className="text-lg font-black hidden lg:block text-[#333333] tracking-tighter italic text-center">MEKIE POS</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveView('sell')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'sell' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">🛒</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Bán Hàng</span>
          </button>
          <button onClick={() => setActiveView('history')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'history' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">📜</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Lịch Sử</span>
          </button>
          <button onClick={() => setActiveView('warehouse')} className={`w-full flex items-center p-4 rounded-xl transition-all font-bold ${activeView === 'warehouse' ? 'bg-[#F9FAFB] text-[#8FA08A] shadow-sm border border-zinc-50' : 'text-zinc-400 hover:bg-zinc-50'}`}>
            <span className="text-lg">📦</span> <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Kho Hàng</span>
          </button>
        </nav>
        <div className="pt-6 border-t border-zinc-50 p-2">
           <div className="hidden lg:block uppercase text-[10px] text-zinc-300 font-bold tracking-widest mb-1">{user?.email}</div>
           <div className="hidden lg:block text-[#8FA08A] text-xs font-black truncate">{user?.tenant_name || user?.tenant_id}</div>
           <button onClick={handleLogout} className="w-full mt-4 flex items-center p-4 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-all text-[10px] uppercase font-bold tracking-widest">🚪 <span className="hidden lg:inline ml-3">Đăng xuất</span></button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-14 overflow-y-auto bg-[#FBFBF9]">
        {activeView === 'sell' && (
          <div className="animate-in fade-in duration-500 flex h-full gap-10">
            <div className="flex-1">
                <header className="mb-14 border-b border-zinc-100 pb-8"><h2 className="text-5xl font-light italic text-[#333333]">Storefront</h2></header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                    <div key={product.id} onClick={() => setActiveProduct(product)} className="bg-white border border-zinc-100 p-10 rounded-[2.5rem] shadow-soft shadow-hover cursor-pointer group flex flex-col items-center">
                    <span className="text-6xl mb-8 group-hover:scale-110 transition-transform">👕</span>
                    <h3 className="text-sm font-bold text-[#333333] mb-2">{product.name}</h3>
                    <p className="text-[#8FA08A] font-medium text-md">{formatVND(product.price)}</p>
                    </div>
                ))}
                </div>
            </div>
            <div className="w-[380px] bg-white rounded-[3rem] p-10 shadow-2xl flex flex-col border border-zinc-50 h-fit sticky top-0">
                 <h3 className="text-2xl font-light italic mb-10">Cart</h3>
                 <div className="flex-1 space-y-6 max-h-[400px] overflow-y-auto pr-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-zinc-50 pb-4">
                        <div><p className="font-bold">{item.name}</p><p className="text-[10px] text-zinc-400 uppercase tracking-tighter">{item.color} / {item.size} x {item.quantity}</p></div>
                        <span className="font-bold">{formatVND(parseFloat(item.price) * item.quantity)}</span>
                      </div>
                    ))}
                 </div>
                 <div className="mt-10 pt-8 border-t border-zinc-50 space-y-4">
                    <div className="flex justify-between text-xs text-zinc-400"><span>Subtotal</span><span className="font-bold">{formatVND(subtotal)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400"><span>Tax (10%)</span><span className="font-bold">{formatVND(tax)}</span></div>
                    <div className="flex justify-between text-xs text-zinc-400 pt-4 border-t border-zinc-50"><span>Total</span><span className="text-xl font-black text-[#8FA08A]">{formatVND(total)}</span></div>
                    <button onClick={handelCheckout} className="w-full bg-[#8FA08A] text-white font-bold py-5 rounded-[1.5rem] shadow-xl shadow-[#8FA08A]/20 uppercase tracking-widest text-[10px] active:scale-95 transition-all">Tạo hóa đơn</button>
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
                  <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.2em] font-black text-zinc-400"><tr><th className="p-8">Mã Đơn</th><th className="p-8">Khách Hàng</th><th className="p-8">Thời Gian</th><th className="p-8 text-right">Tổng Tiền</th></tr></thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {history.map((h, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-8 font-bold text-[#8FA08A]"># {h.id}</td>
                        <td className="p-8">{h.customer_name || 'Khách vãng lai'}</td>
                        <td className="p-8 text-zinc-400">{new Date(h.created_at || h.create_at).toLocaleString('vi-VN')}</td>
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
             <header className="mb-14"><h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Warehouse</h2></header>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-soft flex justify-between items-center group">
                    <div className="flex gap-6 items-center">
                        <div className="w-16 h-16 bg-[#F9FAFB] rounded-2xl flex items-center justify-center text-3xl">👕</div>
                        <div><h4 className="font-bold text-lg">{p.name}</h4><p className="text-[10px] text-zinc-400 uppercase tracking-widest">{p.material} | {p.origin}</p></div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-[#8FA08A] mb-3">{formatVND(p.price)}</p>
                        <button onClick={() => openEditModal(p)} className="bg-[#333333] text-white px-5 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-black transition-all">Sửa kho</button>
                    </div>
                  </div>
                ))}
                {/* [ACTION] Nút Kích hoạt Modal thêm hàng mới */}
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
                    <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Xuất xứ</label>
                    <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.origin || ''} onChange={e => setEditProduct({...editProduct, origin: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 block font-bold">Chất liệu</label>
                  <input type="text" className="w-full bg-[#F9FAFB] border border-zinc-100 rounded-xl px-4 py-3 text-sm focus:border-[#8FA08A] outline-none" value={editProduct.material || ''} onChange={e => setEditProduct({...editProduct, material: e.target.value})} />
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
                  <div className="text-6xl mb-8">👕</div>
                  <h2 className="text-4xl mb-2">{activeProduct.name}</h2>
                  <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-4">{activeProduct.material} | {activeProduct.origin}</p>
                  <p className="text-[#8FA08A] text-2xl font-black not-italic my-8">{formatVND(activeProduct.price)}</p>
                  <div className="flex justify-center gap-4 mb-10">
                    {COLORS.map(c => <button key={c.name} onClick={() => setTempSelection(p=>({...p, color: c.name}))} className={`w-8 h-8 rounded-full ${c.class} ring-offset-4 ring-zinc-300 ${tempSelection.color === c.name ? 'ring-2' : ''}`}></button>)}
                  </div>
                  <button onClick={addToCart} className="w-full bg-[#333333] text-white py-5 rounded-2xl uppercase text-[10px] tracking-widest">Add to cart</button>
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
      {/* 🏡 LUỒNG CÔNG KHAI (Marketplace & Shop) */}
      <Route path="/" element={<Discovery />} />
      <Route path="/store/:tenant_id" element={<PublicStore />} />
      
      {/* 🔑 LUỒNG BẢO MẬT (Chủ Shop / Nhân viên) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pos" element={<POSPage />} />
      
      {/* 🔄 REDIRECT */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
