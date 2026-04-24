import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_URL = 'http://localhost:5000/api';
const bankId = import.meta.env.VITE_BANK_ID || 'Vietcombank';
const bankAcc = import.meta.env.VITE_BANK_ACC || '1035968622';

const formatVND = (amount: any) => {
  const value = parseFloat(amount) * 1000;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function PublicStore() {
  const { tenant_id } = useParams();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States cho Buyer (Người mua)
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [tempSelection, setTempSelection] = useState({ color: 'Black', size: 'S' });
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });

  // States cho Thanh toán SePay
  const [showPayment, setShowPayment] = useState(false);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // ❄️ Anti-lag Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery) return products;
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    return products.filter((p: any) => p.name.toLowerCase()
    .includes(lowerQuery) || (p.price && p.price.toString().includes(lowerQuery)));
  }, [debouncedQuery, products]);
  useEffect(() => {
    fetch(`${API_URL}/public/shops/${tenant_id}/products`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tenant_id]);

  useEffect(() => {
    let interval: any;
    if (showPayment && invoiceId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/transactions/${invoiceId}/status`);
          const data = await res.json();
          if (data.success && data.payment_status === 'Paid') {
            clearInterval(interval);
            setShowPayment(false);
            setCart([]);
            setCustomerInfo({ name: '', email: '' });
            toast.success("🚀 Đặt hàng và Thanh toán thành công! Cảm ơn sếp.", { duration: 8000 });
          }
        } catch (e) {
          console.error("Lỗi khi poll payment status", e);
        }
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [showPayment, invoiceId]);

  const addToCart = () => {
    if (!activeProduct) return;
    setCart(curr => {
      const idx = curr.findIndex(i => i.id === activeProduct.id && i.color === tempSelection.color && i.size === tempSelection.size);
      if (idx > -1) {
        return curr.map((v, i) => i === idx ? { ...v, quantity: v.quantity + 1 } : v);
      }
      return [...curr, { ...activeProduct, ...tempSelection, quantity: 1 }];
    });
    toast.success("Đã thêm vào giỏ hàng");
    setActiveProduct(null);
  };

  const updateQuantity = (idx: number, delta: number) => {
    setCart(curr => {
      const newQty = curr[idx].quantity + delta;
      if (newQty <= 0) return curr.filter((_, i) => i !== idx);
      return curr.map((v, i) => i === idx ? { ...v, quantity: newQty } : v);
    });
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return toast.error("Giỏ hàng trống");
    
    const payload = {
      tenant_id,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      items: cart.map(i => ({ 
        product_id: i.id, 
        quantity: i.quantity, 
        color: i.color, 
        size: i.size 
      })),
      is_public: true
    };

    const res = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      setInvoiceId(data.receipt.id);
      setTotalAmount(subtotal + tax);
      setShowPayment(true);
    } else {
      toast.error(data.error || "Lỗi thanh toán");
    }
  };

  const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) * i.quantity), 0);
  const tax = subtotal * 0.1;

  if (loading) return <div className="min-h-screen flex items-center justify-center font-outfit uppercase tracking-widest text-zinc-300">Curating Store...</div>

  return (
    <div className="min-h-screen bg-[#FBFBF9] font-outfit text-[#333333]">
      <header className="bg-white border-b border-zinc-100 p-6 flex justify-between items-center sticky top-0 z-40 shadow-sm">
         <div className="flex items-center gap-6">
            <Link to="/" className="text-zinc-300 hover:text-[#333333] transition-colors text-xl">←</Link>
            <h1 className="text-xl font-black italic">MEKIE STORE</h1>
         </div>
         <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Shop ID: <span className="text-[#8FA08A]">{tenant_id}</span></div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-14 flex flex-col lg:flex-row gap-14">
        <div className="flex-1">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14">
             <h2 className="text-5xl font-light italic tracking-tighter text-[#333333]">Collection</h2>
             <input 
                 type="text" 
                 placeholder="Tìm món hàng..." 
                 className="bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#8FA08A] shadow-soft w-full lg:w-72 font-medium"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {filteredProducts.map(p => (
              <div key={p.id} onClick={() => setActiveProduct(p)} className="bg-white p-12 rounded-[4rem] border border-zinc-50 shadow-soft hover:shadow-2xl transition-all cursor-pointer group flex flex-col items-center">
                <h3 className="font-bold text-lg mb-2 text-center text-[#333333]">{p.name}</h3>
                <p className="text-zinc-400 text-[10px] uppercase mb-6 font-medium tracking-widest">{p.material} | {p.origin}</p>
                <p className="text-[#8FA08A] font-black text-2xl">{formatVND(p.price)}</p>
                <div className="mt-8 bg-[#333333] text-white px-10 py-3 rounded-full text-[10px] uppercase font-black tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-xl shadow-black/10">Mua ngay</div>
              </div>
            ))}
            {filteredProducts.length === 0 && <div className="col-span-full py-10 text-center text-zinc-400 text-xs italic tracking-widest uppercase">Không tìm thấy sản phẩm</div>}
          </div>
        </div>

        <aside className="w-full lg:w-[450px]">
          <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl sticky top-32 border border-zinc-50 flex flex-col h-fit">
            <h3 className="text-2xl font-light italic mb-10">Basket</h3>
            <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 mb-10 custom-scrollbar">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center animate-in slide-in-from-right-4">
                   <div className="flex-1">
                      <p className="font-bold text-sm mb-1">{item.name}</p>
                      <p className="text-[10px] text-zinc-400 capitalize tracking-tighter">{item.color} / {item.size}</p>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="flex items-center bg-[#F9FAFB] rounded-full px-3 py-1 border border-zinc-50">
                         <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-red-500 font-black">-</button>
                         <span className="mx-3 text-[10px] font-black w-4 text-center">{item.quantity}</span>
                         <button onClick={() => updateQuantity(idx, 1)} className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-[#8FA08A] font-black">+</button>
                      </div>
                      <span className="font-black text-sm w-20 text-right">{formatVND(parseFloat(item.price) * item.quantity)}</span>
                   </div>
                </div>
              ))}
              {cart.length === 0 && <p className="text-zinc-300 text-xs italic text-center py-10 tracking-widest uppercase">Giỏ hàng trống</p>}
            </div>
            
            <form onSubmit={handleCheckout} className="pt-10 border-t border-zinc-50 space-y-6">
               <div className="grid grid-cols-1 gap-4">
                  <input required placeholder="Tên của sếp" className="w-full bg-[#F9FAFB] border border-zinc-50 rounded-2xl px-6 py-4 text-sm focus:border-[#8FA08A] outline-none" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                  <input required type="email" placeholder="Email nhận hóa đơn" className="w-full bg-[#F9FAFB] border border-zinc-50 rounded-2xl px-6 py-4 text-sm focus:border-[#8FA08A] outline-none" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})} />
               </div>

               <div className="space-y-3 pt-4">
                  <div className="flex justify-between text-[11px] text-zinc-400 font-bold uppercase tracking-widest"><span>Subtotal</span><span>{formatVND(subtotal)}</span></div>
                  <div className="flex justify-between text-[11px] text-zinc-400 font-bold uppercase tracking-widest"><span>Tax (10%)</span><span>{formatVND(tax)}</span></div>
                  <div className="flex justify-between items-center pt-6 border-t border-zinc-50">
                    <span className="text-3xl font-black text-[#8FA08A] tracking-tighter">{formatVND(subtotal + tax)}</span>
                    <button type="submit" disabled={cart.length === 0} className="bg-[#8FA08A] text-white px-10 py-5 rounded-3xl text-[10px] uppercase font-black tracking-widest shadow-xl shadow-[#8FA08A]/20 active:scale-95 transition-all disabled:opacity-30">Thanh Toán</button>
                  </div>
               </div>
            </form>
          </div>
        </aside>
      </main>

      {/* 🧥 MODAL: CHỌN BIẾN THỂ */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/60 backdrop-blur-xl">
           <div className="bg-white w-full max-w-xl rounded-[4rem] p-14 shadow-2xl relative border border-zinc-100 animate-in zoom-in-95">
              <button onClick={() => setActiveProduct(null)} className="absolute top-12 right-12 text-zinc-300">✕</button>
              <div className="text-center">
                 <h2 className="text-4xl font-light italic mb-10">{activeProduct.name}</h2>
                 <div className="space-y-12">
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] uppercase font-black text-zinc-300 mb-6 tracking-widest">Select Color</span>
                       <div className="flex gap-6">
                          {['Black', 'White', 'Grey'].map(c => (
                            <button key={c} onClick={() => setTempSelection(p=>({...p, color: c}))} className={`w-10 h-10 rounded-full ring-offset-4 ${c === 'Black' ? 'bg-black' : c === 'White' ? 'bg-white border' : 'bg-zinc-400'} ${tempSelection.color === c ? 'ring-2 ring-[#8FA08A] scale-110' : 'opacity-40'}`}></button>
                          ))}
                       </div>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[10px] uppercase font-black text-zinc-300 mb-6 tracking-widest">Select Size</span>
                       <div className="flex gap-4">
                          {['S', 'M', 'L', 'XL'].map(s => (
                            <button key={s} onClick={() => setTempSelection(p=>({...p, size: s}))} className={`w-14 h-14 rounded-2xl border font-black text-sm ${tempSelection.size === s ? 'bg-[#333333] text-white border-[#333333] scale-110' : 'bg-white text-zinc-400'}`}>{s}</button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="mt-14 pt-10 border-t border-zinc-50 flex justify-between items-center">
                    <span className="text-2xl font-black text-[#8FA08A]">{formatVND(activeProduct.price)}</span>
                    <button onClick={addToCart} className="bg-[#8FA08A] text-white px-12 py-5 rounded-3xl text-[10px] uppercase font-black tracking-widest shadow-xl shadow-[#8FA08A]/20">Bỏ vào giỏ</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 💳 MODAL: THANH TOÁN SEPAY */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/80 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border border-zinc-100 animate-in zoom-in-95 text-center">
              <button 
                 onClick={() => { setShowPayment(false); toast('Sếp vừa hủy thanh toán nha!', { icon: '⚠️' }) }} 
                 className="absolute top-10 right-10 text-zinc-300 font-bold"
              >✕</button>
              <h2 className="text-2xl font-black italic mb-2">Thanh Toán Đơn Hàng</h2>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-8">Vui lòng quét mã QR qua App Ngân Hàng</p>
              
              <div className="bg-zinc-50 rounded-3xl p-6 mb-8 mx-auto w-fit border border-zinc-100">
                <img 
                  src={`https://qr.sepay.vn/img?bank=${bankId}&acc=${bankAcc}&template=compact&amount=${totalAmount}&des=DH${invoiceId}`} 
                  alt="QR Code" 
                  className="rounded-2xl shadow-sm" 
                />
              </div>

              <div className="space-y-2 mb-8">
                <p className="text-sm font-bold text-zinc-600">Nội dung chuyển khoản tự động:</p>
                <div className="bg-[#8FA08A]/10 text-[#8FA08A] font-black text-2xl py-3 rounded-2xl tracking-widest">
                  DH{invoiceId}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 text-zinc-400">
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-widest">Đang chờ thanh toán...</span>
              </div>
           </div>
        </div>
      )}

      {/* 📱 BARS: FLOATING MOBILE CHECKOUT */}
      {cart.length > 0 && !showPayment && (
        <div className="lg:hidden fixed bottom-6 left-6 right-6 bg-[#333333] text-white rounded-[2rem] p-4 flex justify-between items-center shadow-2xl z-40 animate-in slide-in-from-bottom-10 border border-zinc-700">
           <div className="flex flex-col ml-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">{cart.reduce((a, b) => a + b.quantity, 0)} Món</span>
              <span className="text-lg font-black tracking-tighter text-[#8FA08A]">{formatVND(subtotal + tax)}</span>
           </div>
           <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="bg-[#8FA08A] text-white px-6 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest shadow-xl shadow-[#8FA08A]/20 active:scale-95 transition-all">Thanh Toán</button>
        </div>
      )}
    </div>
  );
}
