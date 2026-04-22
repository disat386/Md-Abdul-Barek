import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { geminiService } from '../services/geminiService';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, increment, serverTimestamp, orderBy } from 'firebase/firestore';
import { Users, Key, Package, Tag, ShieldAlert, CheckCircle, X, CreditCard, Settings, Trash2, Plus } from 'lucide-react';

export function AdminDashboard({ onClose }: { onClose: () => void }) {
  const { profile } = useFirebase();
  const [activeTab, setActiveTab] = useState<'users' | 'api' | 'packages' | 'coupons' | 'payments' | 'settings'>('users');
  
  const [users, setUsers] = useState<any[]>([]);
  const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [huggingfaceKey, setHuggingfaceKey] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bkashNumber, setBkashNumber] = useState('');
  const [manualCredits, setManualCredits] = useState<Record<string, string>>({});
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const usersSnap = await getDocs(collection(db, 'users'));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'api' && isSuperAdmin) {
        const keySnap = await getDocs(collection(db, 'api_keys'));
        const geminiDoc = keySnap.docs.find(d => d.id === 'gemini');
        if (geminiDoc) {
          const data = geminiDoc.data();
          if (Array.isArray(data.keys)) {
            setGeminiKeys(data.keys);
          } else if (data.key) {
            setGeminiKeys([data.key]);
          }
        }
        const hfDoc = keySnap.docs.find(d => d.id === 'huggingface');
        if (hfDoc) setHuggingfaceKey(hfDoc.data().key);
      } else if (activeTab === 'packages') {
        const pkgSnap = await getDocs(collection(db, 'packages'));
        setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'coupons') {
        const coupSnap = await getDocs(collection(db, 'coupons'));
        setCoupons(coupSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'payments' && isSuperAdmin) {
        const txSnap = await getDocs(query(collection(db, 'transactions'), orderBy('timestamp', 'desc')));
        setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'settings' && isSuperAdmin) {
        const settingsSnap = await getDocs(collection(db, 'settings'));
        const paymentDoc = settingsSnap.docs.find(d => d.id === 'payment');
        if (paymentDoc) setBkashNumber(paymentDoc.data().bkashNumber);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isSuperAdmin && newRole === 'super_admin') {
      showMessage("Only Super Admins can assign Super Admin role.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showMessage("User role updated", "success");
      fetchData();
    } catch (error) {
      showMessage("Failed to update role", "error");
    }
  };

  const saveApiKeys = async () => {
    try {
      const sanitizedKeys = geminiKeys.map(k => k.trim()).filter(k => k.length > 0);
      await setDoc(doc(db, 'api_keys', 'gemini'), { 
        keys: sanitizedKeys, 
        service: 'gemini',
        updatedAt: serverTimestamp() 
      });
      await setDoc(doc(db, 'api_keys', 'huggingface'), { 
        key: huggingfaceKey.trim(), 
        service: 'huggingface',
        updatedAt: serverTimestamp()
      });
      setNewGeminiKey('');
      setGeminiKeys(sanitizedKeys);
      await geminiService.forceRefresh();
      showMessage("API Keys saved and ecosystem synchronized.", "success");
    } catch (error) {
      showMessage("Failed to save API keys", "error");
    }
  };

  const addGeminiKey = () => {
    if (!newGeminiKey.trim()) return;
    if (geminiKeys.includes(newGeminiKey.trim())) {
      showMessage("Key already exists", "error");
      return;
    }
    setGeminiKeys([...geminiKeys, newGeminiKey.trim()]);
    setNewGeminiKey('');
  };

  const removeGeminiKey = (keyToRemove: string) => {
    setGeminiKeys(geminiKeys.filter(k => k !== keyToRemove));
  };

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'payment'), { bkashNumber });
      showMessage("Settings saved successfully", "success");
    } catch (error) {
      showMessage("Failed to save settings", "error");
    }
  };

  const createPackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const credits = Number(formData.get('credits'));
    const featuresStr = formData.get('features') as string;
    const features = featuresStr ? featuresStr.split('\n').map(f => f.trim()).filter(f => f) : [];
    
    try {
      if (editingPackage) {
        await updateDoc(doc(db, 'packages', editingPackage.id), { name, price, credits, features });
        showMessage("Package updated", "success");
        setEditingPackage(null);
      } else {
        const pkgId = name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'packages', pkgId), { name, price, credits, features, active: true });
        showMessage("Package created", "success");
      }
      e.currentTarget.reset();
      fetchData();
    } catch (error) {
      showMessage("Failed to save package", "error");
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    try {
      await deleteDoc(doc(db, 'packages', pkgId));
      showMessage("Package deleted", "success");
      fetchData();
    } catch (error) {
      showMessage("Failed to delete package", "error");
    }
  };

  const createCoupon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get('code') as string).toUpperCase();
    const discountPercentage = Number(formData.get('discount'));
    const maxUses = Number(formData.get('uses'));
    
    try {
      await setDoc(doc(db, 'coupons', code), { 
        code, 
        discountPercentage, 
        maxUses, 
        usedCount: 0, 
        active: true 
      });
      showMessage("Coupon created", "success");
      e.currentTarget.reset();
      fetchData();
    } catch (error) {
      showMessage("Failed to create coupon", "error");
    }
  };

  const handleTransaction = async (txId: string, userId: string, credits: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await updateDoc(doc(db, 'transactions', txId), { status: 'approved' });
        await updateDoc(doc(db, 'users', userId), { credits: increment(credits) });
        showMessage("Payment approved and credits added", "success");
      } else {
        await updateDoc(doc(db, 'transactions', txId), { status: 'rejected' });
        showMessage("Payment rejected", "success");
      }
      fetchData();
    } catch (error) {
      showMessage("Failed to process transaction", "error");
    }
  };

  const handleAddCredits = async (userId: string) => {
    const amount = parseInt(manualCredits[userId] || '0');
    if (!amount || isNaN(amount) || amount <= 0) {
      showMessage("Enter a valid amount", "error");
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { credits: increment(amount) });
      showMessage(`Added ${amount} credits to user`, "success");
      setManualCredits({ ...manualCredits, [userId]: '' });
      fetchData();
    } catch (error) {
      showMessage("Failed to add credits", "error");
    }
  };

  const generateDefaultPackages = async () => {
    try {
      const pkgs = [
        { id: 'starter', name: 'Starter Pack', price: 150, credits: 500, features: ['Access to all tools', 'Standard generation speed', 'Community support'], active: true },
        { id: 'pro', name: 'Pro Pack', price: 500, credits: 2000, features: ['Access to all tools', 'Priority generation speed', 'Commercial rights included', 'Email support'], active: true },
        { id: 'agency', name: 'Agency Pack', price: 1000, credits: 5000, features: ['Access to all tools', 'Ultra-fast generation', 'Commercial rights included', '24/7 Priority support', 'API Access'], active: true }
      ];
      for (const pkg of pkgs) {
        await setDoc(doc(db, 'packages', pkg.id), pkg);
      }
      showMessage("Recommended packages created!", "success");
      fetchData();
    } catch (error) {
      showMessage("Failed to create packages", "error");
    }
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-orange-500" />
              Admin Control Center
            </h1>
            <p className="text-white/60 mt-2">
              Logged in as: <span className="text-orange-500 font-mono">{profile?.email}</span> ({profile?.role})
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'users' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
            <Users className="w-4 h-4" /> Users
          </button>
          {isSuperAdmin && (
            <>
              <button onClick={() => setActiveTab('api')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'api' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Key className="w-4 h-4" /> API Keys
              </button>
              <button onClick={() => setActiveTab('packages')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'packages' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Package className="w-4 h-4" /> Packages
              </button>
              <button onClick={() => setActiveTab('coupons')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'coupons' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Tag className="w-4 h-4" /> Coupons
              </button>
              <button onClick={() => setActiveTab('payments')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'payments' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <CreditCard className="w-4 h-4" /> Payments
              </button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeTab === 'settings' ? 'bg-orange-500 text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                <Settings className="w-4 h-4" /> Settings
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/40">Loading data...</div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            
            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold mb-6">User Management</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Credits</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="py-4">{u.email}</td>
                          <td className="py-4">{u.displayName || 'N/A'}</td>
                          <td className="py-4 text-orange-500 font-mono">{u.credits}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-400' : u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/60'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              {isSuperAdmin && u.email !== profile?.email && (
                                <select 
                                  value={u.role || 'user'}
                                  onChange={(e) => updateUserRole(u.id, e.target.value)}
                                  className="bg-black border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-orange-500"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>
                              )}
                              <div className="flex items-center gap-1 ml-2">
                                <input 
                                  type="number" 
                                  placeholder="+ Credits" 
                                  className="w-20 bg-black border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-orange-500"
                                  value={manualCredits[u.id] || ''}
                                  onChange={(e) => setManualCredits({...manualCredits, [u.id]: e.target.value})}
                                />
                                <button 
                                  onClick={() => handleAddCredits(u.id)}
                                  className="px-2 py-1 bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 rounded text-xs font-bold"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* API KEYS TAB */}
            {activeTab === 'api' && isSuperAdmin && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold mb-2">Global API Keys</h2>
                <p className="text-white/60 text-sm mb-6">Manage multiple Gemini API keys for automatic rotation and unlimited generation.</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-3 uppercase tracking-wider">Gemini API Keys Pool</label>
                    
                    <div className="space-y-2 mb-4">
                      {geminiKeys.map((key, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-black/40 p-2 rounded-lg border border-white/5">
                          <input
                            type="password"
                            value={key}
                            readOnly
                            className="flex-grow bg-transparent border-none text-white/80 text-sm focus:ring-0"
                          />
                          <button 
                            onClick={() => removeGeminiKey(key)}
                            className="p-1 px-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {geminiKeys.length === 0 && (
                        <p className="text-xs text-white/30 italic py-2 text-center">No Gemini keys added yet.</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={newGeminiKey}
                        onChange={(e) => setNewGeminiKey(e.target.value)}
                        className="flex-grow bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                        placeholder="Add new Gemini API Key..."
                      />
                      <button 
                        onClick={addGeminiKey}
                        className="p-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors shrink-0"
                        title="Add Key to Pool"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <label className="block text-xs font-medium text-white/60 mb-2 uppercase tracking-wider">Hugging Face API Key</label>
                    <input
                      type="password"
                      value={huggingfaceKey || ''}
                      onChange={(e) => setHuggingfaceKey(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="hf_..."
                    />
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button onClick={saveApiKeys} className="flex-grow bg-orange-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-orange-400 transition-colors">
                      Save All Keys
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && isSuperAdmin && (
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold mb-2">Payment Settings</h2>
                <p className="text-white/60 text-sm mb-6">Configure your bKash receiver number for manual payments.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">bKash Number (Personal/Agent)</label>
                    <input
                      type="text"
                      value={bkashNumber || ''}
                      onChange={(e) => setBkashNumber(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500"
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                  <button onClick={saveSettings} className="bg-orange-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-orange-400">
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && isSuperAdmin && (
              <div>
                <h2 className="text-xl font-bold mb-6">bKash Transactions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-white/40 border-b border-white/10">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">User Email</th>
                        <th className="pb-3 font-medium">Package</th>
                        <th className="pb-3 font-medium">Amount (BDT)</th>
                        <th className="pb-3 font-medium">Sender bKash</th>
                        <th className="pb-3 font-medium">TrxID</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.map(tx => (
                        <tr key={tx.id}>
                          <td className="py-4 text-white/60">{tx.timestamp?.toDate().toLocaleDateString()}</td>
                          <td className="py-4">{tx.userEmail}</td>
                          <td className="py-4">{tx.packageName}</td>
                          <td className="py-4 font-mono text-orange-500">৳{tx.amount}</td>
                          <td className="py-4 font-mono">{tx.senderNumber}</td>
                          <td className="py-4 font-mono text-white/80">{tx.transactionId}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider ${
                              tx.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                              tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-4">
                            {tx.status === 'pending' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleTransaction(tx.id, tx.uid, tx.credits, 'approve')} className="px-3 py-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded text-xs font-bold">Approve</button>
                                <button onClick={() => handleTransaction(tx.id, tx.uid, tx.credits, 'reject')} className="px-3 py-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded text-xs font-bold">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-white/40">No transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PACKAGES TAB */}
            {activeTab === 'packages' && isSuperAdmin && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Credit Packages (BDT)</h2>
                  <button onClick={generateDefaultPackages} className="px-4 py-2 bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 rounded-lg text-sm font-bold">
                    Generate 30x Profit Packages
                  </button>
                </div>
                
                <form onSubmit={createPackage} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-black/50 rounded-xl border border-white/5">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-white/40 mb-1">Package Name</label>
                      <input name="name" defaultValue={editingPackage?.name} required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="e.g. Pro Pack" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Price (BDT)</label>
                        <input name="price" defaultValue={editingPackage?.price} type="number" required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="100" />
                      </div>
                      <div>
                        <label className="block text-xs text-white/40 mb-1">Credits</label>
                        <input name="credits" defaultValue={editingPackage?.credits} type="number" required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="1000" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 flex flex-col">
                    <div className="flex-grow">
                      <label className="block text-xs text-white/40 mb-1">Features (One per line)</label>
                      <textarea name="features" defaultValue={editingPackage?.features?.join('\n')} className="w-full h-24 bg-black border border-white/10 rounded px-3 py-2 text-sm resize-none" placeholder="Access to all tools&#10;Priority speed&#10;Commercial rights" />
                    </div>
                    <div className="flex gap-2">
                      {editingPackage && (
                        <button type="button" onClick={() => setEditingPackage(null)} className="flex-1 bg-white/10 text-white font-bold py-2 rounded hover:bg-white/20 transition-colors">Cancel</button>
                      )}
                      <button type="submit" className="flex-1 bg-white text-black font-bold py-2 rounded hover:bg-orange-500 hover:text-white transition-colors">
                        {editingPackage ? 'Update Package' : 'Add Package'}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map(pkg => (
                    <div key={pkg.id} className="p-4 border border-white/10 rounded-xl bg-black flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold">{pkg.name}</h3>
                        <span className="text-green-500 font-mono">৳{pkg.price}</span>
                      </div>
                      <p className="text-orange-500 text-sm mb-4">{pkg.credits} Credits</p>
                      
                      <div className="flex-grow mb-4">
                        <p className="text-xs text-white/40 mb-2">Features:</p>
                        <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                          {pkg.features?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>

                      <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                        <button onClick={() => setEditingPackage(pkg)} className="flex-1 py-1.5 bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 rounded text-xs font-bold transition-colors">Edit</button>
                        <button onClick={() => handleDeletePackage(pkg.id)} className="flex-1 py-1.5 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded text-xs font-bold transition-colors">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COUPONS TAB */}
            {activeTab === 'coupons' && isSuperAdmin && (
              <div>
                <h2 className="text-xl font-bold mb-6">Discount Coupons</h2>
                
                <form onSubmit={createCoupon} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-black/50 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Coupon Code</label>
                    <input name="code" required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm uppercase" placeholder="SUMMER50" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Discount %</label>
                    <input name="discount" type="number" min="1" max="100" required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="50" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Max Uses</label>
                    <input name="uses" type="number" required className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="100" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded hover:bg-orange-500 hover:text-white transition-colors">Create Coupon</button>
                  </div>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {coupons.map(coupon => (
                    <div key={coupon.id} className="p-4 border border-white/10 rounded-xl bg-black">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold font-mono text-orange-500">{coupon.code}</h3>
                        <span className="text-white/60 text-xs">{coupon.usedCount} / {coupon.maxUses} used</span>
                      </div>
                      <p className="text-green-500 text-sm">{coupon.discountPercentage}% OFF</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
