import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function Discovery() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/public/shops`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setShops(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBF9] font-outfit text-[#333333]">
      {/* 🧥 HERO SECTION */}
      <section className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white border-b border-zinc-50 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
            <span className="text-[20rem] font-black absolute -top-20 -left-20">MEK</span>
            <span className="text-[20rem] font-black absolute -bottom-20 -right-20">IE</span>
         </div>
         <h1 className="text-7xl lg:text-9xl font-light italic tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">The Collection</h1>
         <p className="max-w-xl text-zinc-400 text-sm uppercase tracking-[0.4em] font-medium leading-loose animate-in fade-in slide-in-from-bottom-20 duration-1000">Khám phá không gian mua sắm tinh tế từ những thương hiệu hàng đầu</p>
         <div className="mt-14 flex gap-6">
            <a href="#shops" className="bg-[#333333] text-white px-10 py-5 rounded-full text-[10px] uppercase font-black tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95">Explore Shops</a>
            <Link to="/register" className="bg-white border border-zinc-100 text-[#333333] px-10 py-5 rounded-full text-[10px] uppercase font-black tracking-widest hover:bg-zinc-50 transition-all active:scale-95">Open Your Shop</Link>
         </div>
      </section>

      {/* 🛍️ SHOPS GRID */}
      <main id="shops" className="max-w-7xl mx-auto p-12 lg:p-24">
        <div className="flex justify-between items-end mb-16 px-4">
           <div>
              <h2 className="text-4xl font-light italic mb-2">Featured Brands</h2>
              <div className="w-20 h-1 bg-[#8FA08A] rounded-full"></div>
           </div>
           <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest hidden lg:block">{shops.length} Active Stores</p>
        </div>

        {loading ? (
             <div className="text-center py-20 text-zinc-300 uppercase tracking-widest text-[10px] font-black">Curating experience...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {shops.map(shop => (
              <Link to={`/store/${shop.id}`} key={shop.id} className="group bg-white p-12 rounded-[3.5rem] border border-zinc-50 shadow-soft hover:shadow-2xl transition-all flex flex-col items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:scale-150 transition-transform duration-700">
                    <span className="text-6xl font-black italic">{shop.id.substring(0,2)}</span>
                </div>
                <div className="w-24 h-24 bg-[#F9FAFB] rounded-[2rem] flex items-center justify-center text-4xl mb-10 group-hover:scale-110 transition-transform duration-500 shadow-inner">🏬</div>
                <h3 className="text-xl font-bold mb-4 text-center">{shop.name}</h3>
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-8 font-medium">{shop.domain || 'luxury-store.com'}</p>
                <div className="flex items-center text-[#8FA08A] text-[10px] uppercase font-black tracking-[0.2em] transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                   Visit Store <span className="ml-3">→</span>
                </div>
              </Link>
            ))}
            {shops.length === 0 && <div className="col-span-full text-center py-20 text-zinc-300 italic">No luxury shops found yet.</div>}
          </div>
        )}
      </main>

      {/* 🏛️ FOOTER */}
      <footer className="p-20 text-center border-t border-zinc-50 bg-white">
          <p className="text-[10px] uppercase tracking-[0.5em] text-zinc-300 font-bold mb-4">MEKIE POS SaaS Platform</p>
          <div className="text-zinc-200 text-xs italic">Designed for the modern entrepreneur</div>
      </footer>
    </div>
  );
}
