import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';

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
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]); 
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [tempSelection, setTempSelection] = useState({ color: 'Black', size: 'S' });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('pos_token');
    const storedUser = localStorage.getItem('pos_user');
    if (!token) {
      navigate('/login');
      return;
    }
    if (storedUser) setUser(JSON.parse(storedUser));

    fetch(`${API_URL}/products`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
           navigate('/login');
           throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then((payload) => {
        if (payload.success) setProducts(payload.data);
      })
      .catch((err) => console.error("Lỗi kết nối:", err));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    navigate('/login');
  };

  const openDetail = (product: any) => {
    setActiveProduct(product);
    setTempSelection({ color: 'Black', size: 'S' });
  };

  const addToCart = () => {
    if (!activeProduct) return;
    setCart(currentCart => {
      const existingItemIndex = currentCart.findIndex(item => 
        item.id === activeProduct.id && item.color === tempSelection.color && item.size === tempSelection.size
      );
      if (existingItemIndex > -1) {
        return currentCart.map((item, index) => 
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...currentCart, { ...activeProduct, ...tempSelection, quantity: 1 }];
      }
    });
    setActiveProduct(null);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newQty = prev[index].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((item, i) => i === index ? { ...item, quantity: newQty } : item);
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handelCheckout = () =>{
    if(cart.length === 0) return alert("Giỏ hàng trống");
    const token = localStorage.getItem('pos_token');
    const payloadItems = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      color: item.color,
      size: item.size
    }));

    fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ customer_email: 'khachang@shopa.com', items: payloadItems })
    })
    .then(res => res.json())
    .then(data => {
      if(data.success){
        alert("Thanh toán thành công! Mã đơn: " + data.receipt.id);
        setCart([]);
      }
    })
    .catch(err => console.error("Lỗi kết nối:", err));
  }

  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#333333] font-outfit flex overflow-hidden w-full">
      {/* 🌑 SIDEBAR: Pure White Surface */}
      <aside className="w-20 lg:w-64 bg-white border-r border-zinc-100 flex flex-col p-4 shrink-0 shadow-sm">
        <div className="flex items-center mb-10 px-2 pt-4">
          <div className="w-10 h-10 bg-[#8FA08A] rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-lg shadow-[#8FA08A]/10">
             <span className="text-white font-black">L</span>
          </div>
          <h1 className="text-lg font-black hidden lg:block text-[#333333] tracking-tighter italic">LUXURY POS</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <div className="flex items-center p-4 rounded-xl bg-[#F9FAFB] text-[#8FA08A] cursor-pointer shadow-sm border border-zinc-50 transition-all font-bold">
            <span className="text-lg">🛒</span>
            <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest">Bán Hàng</span>
          </div>
          <div className="flex items-center p-4 rounded-xl hover:bg-[#F9FAFB] text-zinc-400 cursor-pointer transition-all group">
            <span className="text-lg opacity-60 group-hover:opacity-100 italic font-serif">📦</span>
            <span className="hidden lg:inline ml-4 uppercase text-[10px] tracking-widest font-medium">Kho Hàng</span>
          </div>
        </nav>
        <div className="pt-6 border-t border-zinc-50">
           <div className="px-3 py-1">
              <p className="text-[9px] text-zinc-300 uppercase tracking-widest hidden lg:block font-bold">Session active</p>
              <p className="text-xs text-zinc-600 font-medium truncate hidden lg:block mt-1">{user?.email}</p>
           </div>
           <button onClick={handleLogout} className="w-full mt-4 flex items-center p-4 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-400 transition-all text-[10px] uppercase font-bold tracking-widest">
             🚪 <span className="hidden lg:inline ml-3">Đăng xuất</span>
           </button>
        </div>
      </aside>

      {/* ⚪ MAIN CONTENT: Ivory Background */}
      <main className="flex-1 p-8 lg:p-14 overflow-y-auto">
        <header className="mb-14 flex justify-between items-end border-b border-zinc-100/50 pb-8">
           <div>
             <h2 className="text-5xl font-light text-[#333333] tracking-tight italic">Storefront</h2>
             <p className="text-zinc-400 text-[10px] mt-4 uppercase tracking-[0.3em] font-medium leading-loose">
               Merchant Space <span className="text-zinc-200 mx-2">|</span> ID <span className="bg-white text-[#8FA08A] px-3 py-1 rounded-full ml-1 border border-zinc-100 font-bold">{user?.tenant_id}</span>
             </p>
           </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {products.map((product) => (
            // [LEARN] Thẻ trắng tinh (bg-white) nổi trên nền ngà (bg-[#FBFBF9]) kèm shadow-soft
            <div 
              key={product.id} 
              onClick={() => openDetail(product)} 
              className="bg-white border border-zinc-100 p-8 rounded-[2rem] shadow-soft shadow-hover cursor-pointer group flex flex-col items-center text-center"
            >
              {/* [LEARN] Loại bỏ khung xám, để icon hòa trực tiếp vào nền trắng của thẻ */}
              <div className="w-full aspect-square flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-[#F9FAFB] rounded-3xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="text-6xl group-hover:scale-110 transition-transform duration-700">👕</span>
              </div>
              <h3 className="text-sm font-bold text-[#333333] mb-2">{product.name}</h3>
              <p className="text-[#8FA08A] font-medium text-md tracking-tighter">{formatVND(product.price)}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 💳 CART: Sidebar Pure White */}
      <aside className="w-80 lg:w-[420px] bg-white border-l border-zinc-100 p-10 flex flex-col shrink-0 shadow-2xl shadow-zinc-200">
        <h3 className="text-3xl font-light italic text-[#333333] mb-12 flex justify-between items-center group">
          Your Cart <span className="text-[10px] not-italic font-black bg-[#F9FAFB] text-zinc-300 px-3 py-1 rounded-full group-hover:text-[#8FA08A] transition-colors">{cart.reduce((a,b)=>a+b.quantity,0)} Items</span>
        </h3>
        <div className="flex-1 overflow-y-auto space-y-8 mb-10 pr-4">
          {cart.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center opacity-30 select-none"><span className="text-6xl mb-4">🛍️</span><p className="text-[10px] uppercase tracking-widest font-black">Waiting for items</p></div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="flex justify-between items-center animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F9FAFB] rounded-2xl flex items-center justify-center text-xl border border-zinc-50 shrink-0">👕</div>
                  <div>
                    <h4 className="text-[13px] font-bold text-[#333333] leading-none mb-2">{item.name}</h4>
                    <div className="flex items-center">
                       <p className="text-[9px] text-zinc-300 uppercase font-black mr-4 tracking-tighter">{item.color} / {item.size}</p>
                       <div className="flex items-center bg-white rounded-lg border border-zinc-100 shadow-sm overflow-hidden">
                          <button onClick={() => updateQuantity(index, -1)} className="w-6 h-6 text-xs hover:bg-[#F9FAFB] text-zinc-400 font-bold transition-colors">-</button>
                          <span className="text-[10px] px-2 font-black text-[#8FA08A]">{item.quantity}</span>
                          <button onClick={() => updateQuantity(index, 1)} className="w-6 h-6 text-xs hover:bg-[#F9FAFB] text-zinc-400 font-bold transition-colors">+</button>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-black text-[#333333] tracking-tighter">{formatVND(parseFloat(item.price) * item.quantity)}</span>
                  <button onClick={() => removeFromCart(index)} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F9FAFB] text-zinc-200 hover:text-red-400 hover:bg-red-50 transition-all mt-3 text-[10px]">✕</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="space-y-4 pt-10 border-t border-zinc-50 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
          <div className="flex justify-between"><span>Subtotal</span><span className="text-[#333333]">{formatVND(subtotal)}</span></div>
          <div className="flex justify-between"><span>Estimated Tax</span><span className="text-[#333333]">{formatVND(tax)}</span></div>
          <div className="flex justify-between text-2xl font-light text-[#333333] pt-8 border-t border-zinc-50 italic">
             <span>Bill Total</span><span className="font-bold not-italic font-sans text-[#8FA08A]">{formatVND(total)}</span>
          </div>
        </div>
        {/* [LEARN] Nút Thanh toán màu Xanh rêu nhạt (Sage Green: #8FA08A) thanh cảnh */}
        <button onClick={handelCheckout} className="w-full mt-10 bg-[#8FA08A] text-white font-black py-6 rounded-[1.5rem] hover:bg-[#7A8B76] transition-all active:scale-[0.97] text-xs uppercase tracking-[0.3em] shadow-2xl shadow-[#8FA08A]/30">
          Process Transaction
        </button>
      </aside>

      {/* 📦 DETAIL MODAL: Pure White Minimalist */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/70 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white border border-zinc-100 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-soft animate-in zoom-in-95 slide-in-from-bottom-10 duration-700">
            <div className="p-12 lg:p-20 relative">
              <button onClick={() => setActiveProduct(null)} className="absolute top-10 right-10 w-12 h-12 bg-[#F9FAFB] hover:bg-zinc-100 rounded-full flex items-center justify-center transition-colors text-zinc-300 hover:text-red-500">✕</button>
              
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-[#F9FAFB] rounded-[2rem] flex items-center justify-center text-6xl mb-12 shadow-sm">👕</div>
                <h2 className="text-5xl font-light text-[#333333] mb-4 tracking-tighter italic">{activeProduct.name}</h2>
                <p className="text-zinc-400 text-sm mb-12 text-center uppercase tracking-widest font-medium">Authentic Collection 2026</p>
                
                <div className="w-full flex justify-between items-center mb-12 py-8 border-y border-zinc-50">
                  <span className="text-zinc-300 uppercase text-[10px] tracking-[0.5em] font-black">Pricing</span>
                  <span className="text-4xl font-black text-[#8FA08A] tracking-tighter">{formatVND(activeProduct.price)}</span>
                </div>

                <div className="w-full grid grid-cols-2 gap-20 mb-14">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-300 mb-6 font-black text-center">Color Palette</p>
                    <div className="flex justify-center gap-5">
                      {COLORS.map(c => (
                        <button key={c.name} onClick={() => setTempSelection(prev => ({ ...prev, color: c.name }))} className={`w-10 h-10 rounded-full ${c.class} shadow-sm ring-offset-8 ring-white transition-all ${tempSelection.color === c.name ? 'ring-2 scale-110' : 'opacity-20 hover:opacity-100'}`} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-300 mb-6 font-black text-center">Select Fit</p>
                    <div className="flex justify-center gap-3">
                      {SIZES.map(s => (
                        <button key={s} onClick={() => setTempSelection(prev => ({ ...prev, size: s }))} className={`w-12 h-12 rounded-2xl text-[11px] font-black transition-all ${tempSelection.size === s ? 'bg-[#8FA08A] text-white shadow-xl shadow-[#8FA08A]/30' : 'bg-[#F9FAFB] text-zinc-300 hover:bg-zinc-100'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={addToCart} className="w-full bg-[#333333] text-white font-black py-6 rounded-[2rem] hover:bg-black transition-all active:scale-[0.98] uppercase tracking-[0.4em] text-xs shadow-2xl">
                   Confirm to cart
                </button>
              </div>
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<POSPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
