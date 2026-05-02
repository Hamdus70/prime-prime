import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { Pill, Droplets, Activity, Search, Filter, Plus, ChevronRight, Package, ShoppingCart, CheckCircle, Clock, AlertCircle, TrendingUp, DollarSign, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/portal/staff/pharmacy")({
  component: PharmacyPage,
});

function PharmacyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/portal/auth" });
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const profSnap = await getDoc(doc(db, "user_profiles", user!.uid));
      setProfile(profSnap.data());
      await updateInitialData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateInitialData() {
    try {
      const oSnap = await getDocs(query(collection(db, "pharmacy_orders"), orderBy("createdAt", "desc"), limit(50)));
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const iSnap = await getDocs(collection(db, "inventory"));
      setInventory(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  }

  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "stockLevel") return a.stockLevel - b.stockLevel;
      if (sortBy === "expiryDate") return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      return a.name.localeCompare(b.name);
    });

  const dashboardMetrics = {
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    lowStock: inventory.filter(i => i.stockLevel < 10).length,
    dispensationsToday: orders.filter(o => {
      if (!o.dispensedAt) return false;
      const date = o.dispensedAt.toDate();
      const today = new Date();
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }).length
  };

  async function processOrder(order: any) {
    if (!profile) return;
    setLoading(true);
    try {
      // 1. Find the inventory item
      const item = inventory.find(i => i.name === order.drugName);
      if (!item || item.stockLevel < order.quantity) {
        alert("Insufficient stock level for this fulfillment.");
        return;
      }

      // 2. Update status of the order
      await updateDoc(doc(db, "pharmacy_orders", order.id), {
        status: "dispensed",
        pharmacistId: user!.uid,
        dispensedAt: serverTimestamp()
      });

      // 3. Update inventory stock
      await updateDoc(doc(db, "inventory", item.id), {
        stockLevel: item.stockLevel - order.quantity
      });

      // 4. Create billing record
      await addDoc(collection(db, "payments"), {
        patientId: order.patientId,
        amount: (item.unitPrice || 0) * order.quantity,
        description: `Medication Dispensed: ${item.name} x ${order.quantity}`,
        status: "pending",
        dueDate: serverTimestamp(),
        type: "invoice",
        createdAt: serverTimestamp(),
        source: "pharmacy"
      });

      // 5. Register clinical alert for dispensed medication if needed (optional)

      await updateInitialData();
      alert("Medication dispensed and billing record generated.");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function addInventoryItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      category: formData.get("category"),
      stockLevel: Number(formData.get("stockLevel")),
      unit: formData.get("unit"),
      unitPrice: Number(formData.get("unitPrice")),
      expiryDate: formData.get("expiryDate"),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "inventory"), data);
      await updateInitialData();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
    }
  }

  async function seedInventory() {
    const samples = [
      { name: "Paracetamol 500mg", category: "drug", stockLevel: 500, unit: "tabs", unitPrice: 0.1, expiryDate: "2026-12-31" },
      { name: "Amoxicillin 250mg", category: "drug", stockLevel: 5, unit: "caps", unitPrice: 0.5, expiryDate: "2026-06-30" },
      { name: "IV Cannula 22G", category: "consumable", stockLevel: 100, unit: "pcs", unitPrice: 1.2, expiryDate: "2027-01-15" },
      { name: "Surgical Mask", category: "consumable", stockLevel: 25, unit: "pcs", unitPrice: 0.3, expiryDate: "2028-10-10" },
      { name: "Blood Pressure Monitor", category: "equipment", stockLevel: 2, unit: "pcs", unitPrice: 45.0, expiryDate: "2030-01-01" },
      { name: "Pediatric Nebulizer", category: "equipment", stockLevel: 8, unit: "pcs", unitPrice: 65.0, expiryDate: "2029-05-20" }
    ];

    for (const s of samples) {
      await addDoc(collection(db, "inventory"), { ...s, createdAt: serverTimestamp() });
    }
    await updateInitialData();
    alert("Sample inventory seeded for evaluation.");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-50 flex-col gap-6">
    <Pill className="h-12 w-12 text-indigo-600 animate-bounce" />
    <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Synchronizing Vault Status...</p>
  </div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-border p-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-premium">
              <Pill className="h-10 w-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Institutional Pharmacy</span>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight italic serif">Pharmacy Fulfillment Console</h1>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
             {["Orders", "Inventory", "Procurement"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {tab}
                </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
             <AnimatePresence mode="wait">
                {activeTab === "Orders" && (
                   <motion.div 
                     key="orders"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-white rounded-[2.5rem] border border-border shadow-clinical overflow-hidden"
                   >
                      <div className="p-8 border-b border-border flex items-center justify-between">
                         <h3 className="font-bold text-slate-900 italic serif">Pending Prescription Queue</h3>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">STATUS:</span>
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-bold uppercase border border-amber-100">{orders.filter(o => o.status === 'pending').length} Actionable</span>
                         </div>
                      </div>
                      <div className="divide-y divide-slate-50">
                         {orders.map(order => (
                            <div key={order.id} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row items-center gap-8 group">
                               <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                                  <Pill className="h-6 w-6" />
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                     <div className="text-xl font-bold text-slate-900 italic serif">{order.drugName} <span className="opacity-40 italic text-sm">- {order.dosage}</span></div>
                                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{order.id.slice(-4)}</span>
                                  </div>
                                  <div className="flex items-center gap-6 mt-2">
                                     <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Plus className="h-3 w-3" /> Qty: {order.quantity}</span>
                                     <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest"><ClipboardList className="h-3 w-3" /> Dr. {order.prescribedBy?.slice(0, 8)}</span>
                                     <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><Clock className="h-3 w-3" /> {new Date(order.createdAt?.seconds * 1000).toLocaleTimeString()}</span>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                     {order.status}
                                  </div>
                                  <button 
                                     onClick={() => processOrder(order)}
                                     disabled={order.status !== 'pending'}
                                     className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-premium disabled:opacity-50 disabled:bg-slate-400"
                                   >
                                      <CheckCircle className="h-5 w-5" />
                                   </button>
                               </div>
                            </div>
                         ))}
                         {orders.length === 0 && <div className="p-20 text-center opacity-30 italic text-sm">No prescriptions in active queue.</div>}
                      </div>
                   </motion.div>
                )}

                {activeTab === "Inventory" && (
                   <motion.div 
                     key="inventory"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="space-y-6"
                   >
                      <div className="bg-white rounded-[2rem] p-6 border border-border shadow-soft flex flex-col md:flex-row gap-4 items-center">
                         <div className="flex-1 relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search vault inventory..." 
                              className="w-full pl-12 pr-6 h-12 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-indigo-100 outline-none transition-all text-sm font-medium"
                            />
                         </div>
                         <div className="flex gap-4 w-full md:w-auto">
                            <select 
                              value={categoryFilter}
                              onChange={(e) => setCategoryFilter(e.target.value)}
                              className="flex-1 md:w-40 h-12 px-6 bg-slate-50 border border-transparent rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-100 appearance-none shadow-inner"
                            >
                               <option value="all">All Types</option>
                               <option value="drug">Drugs</option>
                               <option value="consumable">Consumables</option>
                               <option value="equipment">Equipment</option>
                            </select>
                            <select 
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                              className="flex-1 md:w-40 h-12 px-6 bg-slate-50 border border-transparent rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-600 outline-none focus:border-indigo-100 appearance-none shadow-inner"
                            >
                               <option value="name">Sort by Name</option>
                               <option value="stockLevel">Sort by Stock</option>
                               <option value="expiryDate">Sort by Expiry</option>
                            </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredInventory.map(item => (
                         <div key={item.id} className="bg-white rounded-[2rem] p-6 border border-border shadow-soft flex items-center gap-6 group hover:border-indigo-200 transition-all">
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl shadow-inner ${item.stockLevel < 10 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                               <Package className="h-8 w-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="font-bold text-slate-900 text-lg italic serif truncate">{item.name}</div>
                               <div className="flex items-center gap-4 mt-1">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">STOCK: {item.stockLevel} {item.unit}</span>
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{item.category}</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-sm font-bold text-slate-900 font-display">${item.unitPrice}</div>
                               <div className="text-[8px] font-bold uppercase text-slate-400">Unit Price</div>
                            </div>
                         </div>
                      ))}
                      </div>
                   </motion.div>
                )}
                {activeTab === "Procurement" && (
                   <motion.div 
                     key="procurement"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-white rounded-[2.5rem] p-10 border border-border shadow-clinical"
                   >
                      <h3 className="text-2xl font-bold text-slate-900 italic serif mb-8">Inventory Expansion</h3>
                      <form onSubmit={addInventoryItem} className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Item Name</label>
                               <input name="name" required placeholder="e.g. Paracetamol 500mg" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Category</label>
                               <select name="category" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none appearance-none">
                                  <option value="drug">Drug / Medication</option>
                                  <option value="consumable">Consumables</option>
                                  <option value="equipment">Medical Equipment</option>
                               </select>
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Stock Level</label>
                               <input name="stockLevel" type="number" required placeholder="Quantity" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Unit</label>
                               <input name="unit" required placeholder="e.g. Pack, Bottle, Box" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Unit Price ($)</label>
                               <input name="unitPrice" type="number" step="0.01" required placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Expiry Date</label>
                               <input name="expiryDate" type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none" />
                            </div>
                         </div>
                         <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.2em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3">
                            <Plus className="h-4 w-4" /> Commit to Inventory
                         </button>
                      </form>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>

          <aside className="space-y-8">
             <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/10 transition-colors" />
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-6">Fulfillment Intelligence</h4>
                <div className="space-y-6">
                   <div className="flex justify-between items-end">
                      <div>
                         <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Pending Orders</div>
                         <div className="text-3xl font-bold font-display italic serif">{dashboardMetrics.pendingOrders}</div>
                      </div>
                      <ShoppingCart className="h-8 w-8 opacity-20" />
                   </div>
                   <div className="h-px bg-white/10" />
                   <div className="flex justify-between items-end">
                      <div>
                         <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Dispensations Today</div>
                         <div className="text-2xl font-bold font-display italic serif">{dashboardMetrics.dispensationsToday} <span className="text-[10px] opacity-40 uppercase">Units</span></div>
                      </div>
                      <CheckCircle className="h-8 w-8 opacity-20" />
                   </div>
                   <div className="h-px bg-white/10" />
                   <div className="flex justify-between items-end">
                       <div>
                          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Low Stock Alerts</div>
                          <div className="text-2xl font-bold font-display italic serif text-rose-300">{dashboardMetrics.lowStock} <span className="text-[10px] opacity-40 uppercase">Items</span></div>
                       </div>
                       <AlertCircle className="h-8 w-8 text-rose-500 opacity-30" />
                    </div>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-soft">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900 mb-6 flex items-center justify-between">Inventory Alerts <AlertCircle className="h-4 w-4 text-rose-500" /></h4>
                <div className="space-y-4">
                   {inventory.filter(i => i.stockLevel < 15).map(i => (
                      <div key={i.id} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                         <div>
                            <div className="text-[11px] font-bold text-slate-900 truncate max-w-[120px] italic serif">{i.name}</div>
                            <div className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">{i.stockLevel} units left</div>
                         </div>
                         <button className="h-8 w-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-200 transition-colors">
                            <ShoppingCart className="h-3.5 w-3.5" />
                         </button>
                      </div>
                   ))}
                   {inventory.filter(i => i.stockLevel < 15).length === 0 && <p className="text-xs italic text-center text-slate-400 py-10">All stock levels stabilized.</p>}
                </div>
             </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
