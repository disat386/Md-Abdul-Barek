import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Key, 
  RotateCw,
  ExternalLink,
  Code,
  Users,
  Search,
  CreditCard,
  Ticket,
  Settings as SettingsIcon,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Clock,
  UserPlus,
  Coins,
  Package as PackageIcon,
  Tag,
  Eye,
  Check,
  X,
  LayoutDashboard,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity as ActivityIcon,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  getDocs,
  writeBatch,
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  increment,
  startAt,
  endAt
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel({ profile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<'keys' | 'users' | 'packages' | 'payments' | 'coupons' | 'settings' | 'analytics'>(
    profile?.role === 'super-admin' ? 'keys' : 'users'
  );
  
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Package Management State
  const [packages, setPackages] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  
  // Payment Verification State
  const [payments, setPayments] = useState<any[]>([]);
  
  // Global Settings State
  const [settings, setSettings] = useState({
    bkashNumber: '',
    nagadNumber: '',
    minProfitMargin: 30,
    budgetLimit: 1300,
    totalSpent: 0
  });

  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [isRefreshingAnalytics, setIsRefreshingAnalytics] = useState(false);

  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [isRefreshingKeys, setIsRefreshingKeys] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(() => Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  const fetchKeys = async () => {
    setIsRefreshingKeys(true);
    // eslint-disable-next-line react-hooks/purity
    const timestamp = Date.now();
    setNow(timestamp); 
    console.log("Auurio: Refreshing pool data...");
    try {
      const q = query(collection(db, 'api_keys'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setKeys(data);
      console.log(`Auurio: ${data.length} keys synchronized with local state.`);
    } catch (err: any) {
      console.error("Auurio: Manual refresh failed:", err.message);
      alert("Refresh failed: " + err.message);
    } finally {
      setTimeout(() => setIsRefreshingKeys(false), 800);
    }
  };

  const handleResetAllKeys = async () => {
    console.log("Auurio: Reset All Status triggered.");
    
    setIsRefreshingKeys(true);
    try {
      console.log("Auurio: Fetching fresh key list for reset...");
      const q = query(collection(db, 'api_keys'));
      const snapshot = await getDocs(q);
      const allKeys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (allKeys.length === 0) {
        console.log("Auurio: No keys found to reset.");
        alert("No keys found to reset.");
        return;
      }

      console.log(`Auurio: Processing ${allKeys.length} keys for reset...`);
      
      const chunks: any[][] = [];
      for (let i = 0; i < allKeys.length; i += 500) {
        chunks.push(allKeys.slice(i, i + 500));
      }

      let totalReset = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(key => {
          const ref = doc(db, 'api_keys', key.id);
          batch.update(ref, {
            priority: 0,
            status: 'active',
            coolDownUntil: 0,
            lastError: null
          });
          totalReset++;
        });
        await batch.commit();
        console.log(`Auurio: Committed batch of ${chunk.length} keys.`);
      }

      const batchTimestamp = Date.now();
      setNow(batchTimestamp);
      console.log(`Auurio: Reset complete. Total keys updated: ${totalReset}`);
      alert(`Success: Reset status for ${totalReset} keys.`);
    } catch (err: any) {
      console.error("Auurio: Batch reset critical failure:", err);
      if (err.message?.includes('permission-denied')) {
        alert("Permission Denied: Your account role does not have permission to modify API keys. Current role: " + (currentUserData?.role || 'unknown'));
      } else {
        alert("Reset failed: " + err.message);
      }
    } finally {
      setIsRefreshingKeys(false);
      setIsConfirmingReset(false);
    }
  };

  const handleResetKey = async (id: string) => {
    try {
      await updateDoc(doc(db, 'api_keys', id), {
        priority: 0,
        status: 'active',
        coolDownUntil: 0,
        lastError: null
      });
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      setNow(timestamp);
    } catch (err: any) {
      console.error("Key reset failed:", err.message);
      alert("Failed: " + err.message);
    }
  };

  // Vertex Config State is removed as per user request to use only free pool
  
  useEffect(() => {
    const q = query(collection(db, 'api_keys'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setKeys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Auurio: Snapshot listener failed. Check permissions:", error);
    });

    // Fetch User Role
    const fetchData = async () => {
      try {
        // Fetch current user data from auth if needed, but we typically use Firestore
        // Assuming we have auth.currentUser.uid
        const { auth } = await import('../firebase');
        if (auth.currentUser) {
          const uSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (uSnap.exists()) {
            setCurrentUserData(uSnap.data());
          }
        }
      } catch (err) {
        console.warn("Auurio: Initial fetch data error:", err);
      }
    };
    fetchData();

    // Listeners for all management collections
    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(50)), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPackages = onSnapshot(query(collection(db, 'packages'), orderBy('price')), (snap) => {
      setPackages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as any);
    });

    return () => {
      unsubscribe();
      unsubUsers();
      unsubPackages();
      unsubCoupons();
      unsubPayments();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics') {
      const q = query(collection(db, 'usage_logs'), orderBy('createdAt', 'desc'), limit(500));
      const unsubscribe = onSnapshot(q, (snap) => {
        setUsageLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsRefreshingAnalytics(false);
      }, (err) => {
        console.error("Analytics fetch error:", err);
        setIsRefreshingAnalytics(false);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  const analyticsSummary = React.useMemo(() => {
    if (!usageLogs.length) return null;

    const costByFeatureRaw = usageLogs.reduce((acc: any, log: any) => {
      acc[log.feature] = (acc[log.feature] || 0) + (log.cost || 0);
      return acc;
    }, {});

    const costByModelRaw = usageLogs.reduce((acc: any, log: any) => {
      acc[log.modelId] = (acc[log.modelId] || 0) + (log.cost || 0);
      return acc;
    }, {});

    const dailyUsageRaw = usageLogs.reduce((acc: any, log: any) => {
      const date = log.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent';
      acc[date] = (acc[date] || 0) + (log.cost || 0);
      return acc;
    }, {});

    const topUsersRaw = usageLogs.reduce((acc: any, log: any) => {
      const email = log.userEmail || 'anonymous';
      acc[email] = (acc[email] || 0) + (log.cost || 0);
      return acc;
    }, {});

    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#6366F1', '#EC4899', '#8B5CF6', '#F59E0B', '#14B8A6'];

    return {
      colors: COLORS,
      costByFeature: Object.entries(costByFeatureRaw).map(([name, value]) => ({ name, value })),
      costByModel: Object.entries(costByModelRaw).map(([name, value]) => ({ name, value })),
      dailyUsage: Object.entries(dailyUsageRaw).map(([name, value]) => ({ name, value })).reverse().slice(0, 15),
      topUsers: Object.entries(topUsersRaw)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => (b.value as number) - (a.value as number))
        .slice(0, 10)
    };
  }, [usageLogs]);

  // User Management Actions
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Search by email
      const q = query(
        collection(db, 'users'), 
        where('email', '>=', searchQuery),
        where('email', '<=', searchQuery + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const updateUserCredits = async (userId: string, amount: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        credits: increment(amount)
      });
      alert(`Successfully added ${amount} credits`);
    } catch (err) {
      alert("Failed to update credits");
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (profile.role !== 'super-admin') {
      alert("Only Super Admin can change roles");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
    } catch (err) {
      alert("Failed to update role");
    }
  };

  // Payment Actions
  const handleVerifyPayment = async (payment: any) => {
    try {
      const batch = writeBatch(db);
      // Update payment status
      batch.update(doc(db, 'payments', payment.id), { status: 'verified' });
      // Add credits to user
      batch.update(doc(db, 'users', payment.userId), { credits: increment(payment.credits) });
      await batch.commit();
    } catch (err) {
      alert("Verification failed");
    }
  };

  // Settings Actions
  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert("Settings saved");
    } catch (err) {
      alert("Save failed");
    }
  };

  // Package Actions
  const handleAddPackage = async (name: string, price: number, credits: number) => {
    try {
      await addDoc(collection(db, 'packages'), {
        name,
        price,
        credits,
        features: ["Standard Features"],
        popular: false,
        createdAt: serverTimestamp()
      });
      alert("Package created");
    } catch (err) {
      alert("Failed to create package");
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    try {
      await deleteDoc(doc(db, 'packages', id));
    } catch (err) {
      alert("Failed to delete package");
    }
  };

  const handleUpdatePackage = async (id: string, name: string, price: number, credits: number) => {
    try {
      await updateDoc(doc(db, 'packages', id), {
        name,
        price,
        credits,
        updatedAt: serverTimestamp()
      });
      alert("Package updated");
      setEditingPackage(null);
    } catch (err) {
      alert("Failed to update package");
    }
  };

  const handleUpdateCoupon = async (id: string, code: string, type: string, value: number, limitCount: number) => {
    try {
      await updateDoc(doc(db, 'coupons', id), {
        code: code.toUpperCase(),
        discountType: type,
        value,
        usageLimit: limitCount,
        updatedAt: serverTimestamp()
      });
      alert("Coupon updated");
      setEditingCoupon(null);
    } catch (err) {
      alert("Failed to update coupon");
    }
  };

  // Coupon Actions
  const handleAddCoupon = async (code: string, type: string, value: number, limitCount: number) => {
    try {
      await addDoc(collection(db, 'coupons'), {
        code: code.toUpperCase(),
        discountType: type,
        value,
        usageLimit: limitCount,
        usageCount: 0,
        createdAt: serverTimestamp()
      });
      alert("Coupon created");
    } catch (err) {
      alert("Failed to create coupon");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (err) {
      alert("Failed to delete coupon");
    }
  };

  const handleAddKey = async () => {
    if (!newKey || newKey.length < 20) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'api_keys'), {
        key: newKey,
        provider: 'gemini',
        status: 'active',
        priority: 0,
        lastUsed: 0,
        createdAt: serverTimestamp(),
      });
      setNewKey('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (confirm('Are you sure you want to delete this key?')) {
      await deleteDoc(doc(db, 'api_keys', id));
    }
  };


  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-green-500" />
            Admin Hub
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-zinc-500 font-medium">Manage master resources and ecosystem API keys.</p>
            {currentUserData && (
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                currentUserData.role === 'super-admin' ? "bg-purple-500/10 text-purple-500 border border-purple-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              )}>
                {currentUserData.role || 'User'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/5 pb-1 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap">
        {[
          { id: 'keys', label: 'AI API Management', icon: Key },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'packages', label: 'Packages', icon: PackageIcon },
          { id: 'payments', label: 'Payments', icon: CreditCard },
          { id: 'coupons', label: 'Coupons', icon: Ticket },
          { id: 'analytics', label: 'Smart Analytics', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3 px-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === tab.id ? "border-b-2 border-orange-500 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-12">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search users by email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-zinc-500 text-xs font-bold">
                    <span>Total Loaded: {users.length}</span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-black/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Credits</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold overflow-hidden shadow-inner">
                                {u.photoURL ? <img src={u.photoURL} alt="" /> : u.displayName?.[0] || u.email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{u.displayName || 'Anonymous User'}</p>
                                <p className="text-zinc-500 text-xs">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-yellow-500" />
                              <span className="font-bold text-white">{u.credits?.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={u.role || 'user'}
                              onChange={(e) => updateUserRole(u.id, e.target.value)}
                              disabled={profile.role !== 'super-admin'}
                              className="bg-black border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-orange-500 outline-none"
                            >
                              <option value="user">USER</option>
                              <option value="sub-admin">SUB ADMIN</option>
                              <option value="super-admin">SUPER ADMIN</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  const amt = prompt("Enter amount of credits to add (e.g. 500, -200):");
                                  if (amt && !isNaN(parseInt(amt))) {
                                    updateUserCredits(u.id, parseInt(amt));
                                  }
                                }}
                                className="p-2 bg-white/5 hover:bg-orange-500/20 text-orange-500 rounded-lg transition-colors"
                                title="Add Custom Credits"
                              >
                                <Coins className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setSelectedUser(u)}
                                className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                                title="View User Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'packages' && (
              <motion.div
                key="packages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <button 
                  onClick={() => {
                    const name = prompt("Package Name:");
                    const price = parseInt(prompt("Price (৳):") || "0");
                    const credits = parseInt(prompt("Credits:") || "0");
                    if (name && price && credits) handleAddPackage(name, price, credits);
                  }}
                  className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-zinc-500 hover:text-white hover:border-orange-500/30 transition-all group"
                >
                  <div className="p-4 bg-zinc-900 rounded-2xl group-hover:scale-110 transition-transform">
                    <Plus className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Create New Package</span>
                </button>

                {packages.map((pkg) => (
                  <div key={pkg.id} className="p-8 bg-zinc-900 border border-white/5 rounded-3xl relative group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
                        <PackageIcon className="w-6 h-6" />
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={() => {
                             const name = prompt("New Name:", pkg.name) || pkg.name;
                             const price = parseInt(prompt("New Price (৳):", pkg.price.toString()) || pkg.price.toString());
                             const credits = parseInt(prompt("New Credits:", pkg.credits.toString()) || pkg.credits.toString());
                             if (name && !isNaN(price) && !isNaN(credits)) {
                               handleUpdatePackage(pkg.id, name, price, credits);
                             }
                           }}
                           className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white"
                           title="Edit Package"
                         >
                           <SettingsIcon className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDeletePackage(pkg.id)}
                           className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500"
                           title="Delete Package"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                    <h4 className="text-xl font-black italic tracking-tighter mb-2">{pkg.name}</h4>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-black tracking-tighter">৳{pkg.price}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">/ one-time</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-bold text-white">{pkg.credits?.toLocaleString()} Credits</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden overflow-x-auto"
              >
                 <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-black/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Number</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                p.method === 'bkash' ? 'bg-pink-500' : 'bg-red-500'
                              )} />
                              <span className="text-xs font-black uppercase italic">{p.method}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-white">{p.transactionId}</td>
                          <td className="px-6 py-4 text-xs font-bold text-zinc-400">{p.senderNumber}</td>
                          <td className="px-6 py-4 font-black">৳{p.amount}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              p.status === 'verified' ? 'bg-green-500/10 text-green-500' : 
                              p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                            )}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {p.status === 'pending' && (
                              <button 
                                onClick={() => handleVerifyPayment(p)}
                                className="px-4 py-2 bg-green-500 text-black text-[10px] font-black uppercase tracking-tighter rounded-xl hover:bg-green-400 transition-all active:scale-95"
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
              </motion.div>
            )}

            {activeTab === 'coupons' && (
              <motion.div
                key="coupons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                 <button 
                  onClick={() => {
                    const code = prompt("Coupon Code:");
                    const val = parseInt(prompt("Value (number):") || "0");
                    const type = confirm("Is this a percentage discount? (OK = Percent, Cancel = Fixed)") ? "percent" : "fixed";
                    const lim = parseInt(prompt("Usage Limit:") || "100");
                    if (code && val) handleAddCoupon(code, type, val, lim);
                  }}
                  className="p-8 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 text-zinc-500 hover:border-orange-500/20 group transition-all"
                >
                    <Ticket className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">New Coupon</span>
                 </button>
                 {coupons.map((c) => (
                   <div key={c.id} className="p-6 bg-zinc-900 border border-white/5 rounded-3xl">
                      <div className="flex items-center justify-between mb-4">
                        <Tag className="w-5 h-5 text-zinc-500" />
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const code = prompt("New Code:", c.code) || c.code;
                              const val = parseInt(prompt("New Value:", c.value.toString()) || c.value.toString());
                              const lim = parseInt(prompt("New Usage Limit:", c.usageLimit.toString()) || c.usageLimit.toString());
                              handleUpdateCoupon(c.id, code, c.discountType, val, lim);
                            }}
                            className="text-zinc-700 hover:text-orange-500 transition-colors"
                          >
                            <SettingsIcon className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-orange-500">{c.value}{c.discountType === 'percent' ? '%' : '৳'} OFF</span>
                          <button onClick={() => handleDeleteCoupon(c.id)} className="text-zinc-700 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-xl font-mono text-white mb-1 uppercase tracking-tighter">{c.code}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{c.usageCount} / {c.usageLimit} USES</p>
                   </div>
                 ))}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-8"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/5 rounded-2xl">
                    <Smartphone className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Payment Methods</h3>
                    <p className="text-xs text-zinc-500 font-medium">Configure merchant numbers for user orientation.</p>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">bKash Personal</label>
                        <input 
                          type="text" 
                          value={settings.bkashNumber}
                          onChange={(e) => setSettings({...settings, bkashNumber: e.target.value})}
                          placeholder="e.g. 017xxxxxxxx"
                          className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-pink-500 transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nagad Personal</label>
                        <input 
                          type="text" 
                          value={settings.nagadNumber}
                          onChange={(e) => setSettings({...settings, nagadNumber: e.target.value})}
                          placeholder="e.g. 017xxxxxxxx"
                          className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-red-500 transition-all text-sm"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Target Profit Margin (%)</label>
                      <input 
                        type="number" 
                        value={settings.minProfitMargin}
                        onChange={(e) => setSettings({...settings, minProfitMargin: parseInt(e.target.value)})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-orange-500 transition-all text-sm"
                      />
                   </div>

                   <button 
                    onClick={saveSettings}
                    className="w-full py-4 bg-orange-500 text-black font-black uppercase tracking-tighter rounded-2xl hover:bg-orange-400 transition-all active:scale-95"
                   >
                     Update Platform Configuration
                   </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'keys' && (
              <motion.div
                key="keys"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Key className="text-blue-500" />
                      AI API Control Center
                    </h3>
                    <button 
                      onClick={fetchKeys}
                      disabled={isRefreshingKeys}
                      className={cn(
                        "p-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-white transition-all active:scale-90",
                        isRefreshingKeys && "bg-blue-500/10 text-blue-500"
                      )}
                      title="Sync Status from Database"
                    >
                      <RotateCw className={cn("w-3.5 h-3.5", isRefreshingKeys && "animate-spin")} />
                    </button>
                    {!isConfirmingReset ? (
                      <button 
                        onClick={() => setIsConfirmingReset(true)}
                        disabled={isRefreshingKeys || keys.length === 0}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-tighter py-1 px-2 border rounded-md transition-all active:scale-95 flex items-center gap-1.5",
                          isRefreshingKeys 
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/30" 
                            : "text-blue-400/50 hover:text-blue-400 border-blue-500/10 hover:border-blue-500/30"
                        )}
                      >
                        {isRefreshingKeys && <RotateCw className="w-2.5 h-2.5 animate-spin" />}
                        Reset All Status
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleResetAllKeys}
                          disabled={isRefreshingKeys}
                          className="text-[9px] font-black uppercase bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600 transition-all"
                        >
                          Confirm Reset?
                        </button>
                        <button 
                          onClick={() => setIsConfirmingReset(false)}
                          className="text-[9px] font-black uppercase text-zinc-500 py-1 px-2 rounded-md hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                    {keys.length} Active in Pool
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Add New Gemini API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="Enter Gemini API Key (AI Studio)..."
                      className="flex-1 bg-black border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors font-mono"
                    />
                    <button
                      onClick={handleAddKey}
                      disabled={isAdding}
                      className="bg-blue-500 text-white font-bold px-6 rounded-2xl hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAdding ? <RotateCw className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> <span>Add Key</span></>}
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-600 font-medium ml-1 italic">Note: Keys are added to the global load-balanced pool.</p>
                </div>

                <div className="space-y-4">
                  {keys.map((k) => {
                    const isCooldown = k.coolDownUntil && k.coolDownUntil > now;
                    const lastUsedStr = k.lastUsed ? new Date(k.lastUsed).toLocaleTimeString() : 'Never';
                    
                    return (
                      <div
                        key={k.id}
                        className="p-5 bg-black/40 border border-white/5 rounded-3xl group transition-all hover:border-blue-500/30"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative">
                              <div className={cn(
                                "w-3 h-3 rounded-full animate-pulse", 
                                k.status !== 'active' ? 'bg-red-500' : (k.priority === 1 ? 'bg-orange-500' : 'bg-green-500')
                              )} />
                              {isCooldown && (
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-mono text-white font-bold truncate">{k.key.substring(0, 8)}••••••••{k.key.slice(-4)}</p>
                                {k.priority === 0 && !isCooldown && (
                                  <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Priority 0: Working</span>
                                )}
                                {k.priority === 1 && (
                                  <span className="text-[9px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Priority 1: Quota Full</span>
                                )}
                                {isCooldown && (
                                  <span className="text-[9px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Cool-down</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-1">
                                  <RotateCw className="w-2.5 h-2.5" /> Last: {lastUsedStr}
                                </p>
                                {k.lastError && (
                                  <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-tight truncate max-w-[200px]">
                                    Error: {k.lastError}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            {(k.priority !== 0 || isCooldown || k.status !== 'active') && (
                              <button 
                                onClick={() => handleResetKey(k.id)}
                                className="p-2 text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="Reset Status"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteKey(k.id)} 
                              className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-8"
              >
                {/* Budget Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 flex items-center justify-between group hover:border-orange-500/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Budget</p>
                      <h2 className="text-3xl font-black text-white italic tracking-tighter">${settings.budgetLimit || 1300}</h2>
                    </div>
                    <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Total Spent</p>
                      <h2 className="text-3xl font-black text-white italic tracking-tighter">${settings.totalSpent?.toFixed(4) || 0}</h2>
                    </div>
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                      <ActivityIcon className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 flex items-center justify-between group hover:border-green-500/20 transition-all">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Remaining Credit</p>
                      <h2 className="text-3xl font-black text-green-500 italic tracking-tighter">${((settings.budgetLimit || 1300) - (settings.totalSpent || 0)).toFixed(4)}</h2>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-2xl text-green-500 group-hover:scale-110 transition-transform">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {/* Usage Trend */}
                   <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                       <LineChartIcon className="w-4 h-4 text-blue-500" /> Usage Trend (USD)
                     </h3>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsSummary?.dailyUsage || []}>
                            <defs>
                              <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#4B5563" />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#4B5563" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                              itemStyle={{ color: '#3B82F6', fontWeight: 900 }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#3B82F6" fillOpacity={1} fill="url(#colorUsage)" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                     </div>
                   </div>

                   {/* Cost by Feature */}
                   <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
                     <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2">
                       <PieChartIcon className="w-4 h-4 text-orange-500" /> Feature Cost Distribution
                     </h3>
                     <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsSummary?.costByFeature || []}
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {analyticsSummary?.costByFeature.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={analyticsSummary.colors[index % analyticsSummary.colors.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Top Spenders */}
                  <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" /> Top Spending Users
                    </h3>
                    <div className="space-y-4">
                      {analyticsSummary?.topUsers.map((user: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-purple-500/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-[10px] font-black text-purple-500">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-bold text-zinc-300">{user.name}</span>
                          </div>
                          <span className="text-xs font-black text-white tracking-widest">${user.value.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profit Tracker */}
                  <div className="bg-zinc-900 border border-white/5 rounded-[40px] p-8">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-500" /> Model Efficiency
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsSummary?.costByModel || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                            <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} stroke="#4B5563" />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#4B5563" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {analyticsSummary?.costByModel.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={analyticsSummary.colors[index % analyticsSummary.colors.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                </div>

                {/* Recent Logs Table */}
                <div className="bg-zinc-900 border border-white/5 rounded-[40px] overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <ActivityIcon className="w-4 h-4 text-blue-500" /> Raw consumption Logs
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-white/5">
                          <th className="px-8 py-4">Timestamp</th>
                          <th className="px-8 py-4">User</th>
                          <th className="px-8 py-4">Feature</th>
                          <th className="px-8 py-4">Model</th>
                          <th className="px-8 py-4">Tokens (I/O)</th>
                          <th className="px-8 py-4 text-right">Cost (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {usageLogs.slice(0, 50).map((log) => (
                          <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-8 py-4 text-[10px] text-zinc-500 font-medium">
                              {log.createdAt?.toDate?.()?.toLocaleString() || 'Processsing...'}
                            </td>
                            <td className="px-8 py-4 text-xs font-bold text-zinc-300">
                              {log.userEmail}
                            </td>
                            <td className="px-8 py-4">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                {log.feature}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-xs font-mono text-zinc-500">
                              {log.modelId}
                            </td>
                            <td className="px-8 py-4 text-xs font-bold text-zinc-400">
                              {log.inputTokens || 0} / {log.outputTokens || 0}
                            </td>
                            <td className="px-8 py-4 text-right text-xs font-black text-white tracking-widest">
                              ${log.cost?.toFixed(5)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Details Modal */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedUser(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-zinc-900 border border-white/10 w-full max-w-lg rounded-[40px] p-8 md:p-10 relative z-10 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">User Profile</h3>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-zinc-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Email Address</p>
                    <p className="text-lg font-bold text-white">{selectedUser.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Current Balance</p>
                      <p className="text-2xl font-black text-yellow-500 italic tracking-tighter">{selectedUser.credits?.toLocaleString() || 0} <span className="text-xs uppercase not-italic opacity-50">CDT</span></p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Account Role</p>
                      <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        selectedUser.role === 'admin' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        const amt = prompt("Amount of credits to add:");
                        if (amt && !isNaN(parseInt(amt))) {
                          updateUserCredits(selectedUser.id, parseInt(amt));
                          setSelectedUser({...selectedUser, credits: (selectedUser.credits || 0) + parseInt(amt)});
                        }
                      }}
                      className="py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Coins className="w-4 h-4" />
                      Add Credits
                    </button>
                    <button 
                      onClick={() => {
                        const newRole = selectedUser.role === 'admin' ? 'user' : 'admin';
                        if (confirm(`Change role to ${newRole}?`)) {
                          updateUserRole(selectedUser.id, newRole);
                          setSelectedUser({...selectedUser, role: newRole});
                        }
                      }}
                      className="py-4 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {selectedUser.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => {
                      // Login as... is hard with Firebase Client SDK alone, so we just visual link
                      window.open(`/dashboard#uid=${selectedUser.id}`, '_blank');
                    }}
                    className="w-full py-4 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:text-white hover:border-white/20 transition-all"
                  >
                    Enter Account View
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>
  );
}
