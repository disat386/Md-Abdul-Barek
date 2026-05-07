import React, { useState, useEffect } from 'react';
import { 
  History, 
  Wallet, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MoreVertical,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronRight,
  Database,
  CloudLightning
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  limit
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';

interface ActivityProps {
  userId: string;
}

type Tab = 'generations' | 'finances';

export default function Activity({ userId }: ActivityProps) {
  const [activeTab, setActiveTab] = useState<Tab>('generations');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    // Live Sync for Projects
    const projectsQuery = query(
      collection(db, 'projects'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Live Sync for Transactions
    const transQuery = query(
      collection(db, `users/${userId}/transactions`),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProjects();
      unsubTrans();
    };
  }, [userId]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'draft': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (p.topic || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reference for stable date calculations
  const now = React.useMemo(() => new Date(), []);

  // Helper to safely format dates from various sources (Firestore Timestamp, Date, string)
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Recent';
    try {
      if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toLocaleDateString();
      }
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? 'Recent' : date.toLocaleDateString();
    } catch (e) {
      return 'Recent';
    }
  };

  const getExpiresIn = (project: any) => {
    const created = project.createdAt?.toDate ? project.createdAt.toDate() : (new Date(project.createdAt || now));
    const diff = 30 - Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days` : 'soon';
  };

  return (
    <div className="space-y-6">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-white/5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('generations')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'generations' ? "bg-orange-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Generations
          </button>
          <button
            onClick={() => setActiveTab('finances')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'finances' ? "bg-orange-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"
            )}
          >
            Finances
          </button>
        </div>

        {activeTab === 'generations' && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 w-full md:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs text-zinc-400 font-bold appearance-none focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 animate-pulse">Syncing Workspace...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'generations' ? (
              <motion.div
                key="generations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {filteredProjects.length > 0 ? filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    className="glass-panel group relative rounded-3xl overflow-hidden p-6 hover:border-white/10 transition-all duration-500"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5",
                             getStatusColor(project.status)
                           )}>
                             {project.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                             {project.status}
                           </div>
                           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                             {project.type || 'Production'}
                           </span>
                        </div>
                        <h4 className="text-lg font-black text-white italic tracking-tighter group-hover:text-orange-500 transition-colors">
                          {project.title || 'Untitled Project'}
                        </h4>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(project.id, e)}
                        className="p-2 bg-zinc-800/50 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {project.status === 'processing' && (
                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Processing Node</p>
                          <p className="text-xs font-black text-orange-500">{project.progress || 0}%</p>
                        </div>
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-orange-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-zinc-500 italic">
                        Last Modified: {formatDate(project.createdAt)}
                      </p>
                      <button
                        onClick={() => navigate(`${project.type === 'reel' ? '/reel' : project.type === 'cine' ? '/cine' : '/thumb'}?projectId=${project.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-colors"
                      >
                        {project.status === 'completed' ? 'Open' : 'Continue'}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>

                    {project.status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-[8px] font-black text-red-500/60 uppercase tracking-widest flex items-center gap-1.5">
                          <CloudLightning className="w-3 h-3" />
                          Auto-deletion active: Expires in {getExpiresIn(project)}
                        </p>
                      </div>
                    )}

                    {/* Active Pulse indicator */}
                    {project.status === 'processing' && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse bg-[length:200%_100%]" />
                    )}
                  </motion.div>
                )) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                    <CloudLightning className="w-12 h-12 text-zinc-800" />
                    <p className="text-sm text-zinc-500 italic">No matching projects found in your workspace.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="finances"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {transactions.length > 0 ? (
                  <div className="glass-panel rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-zinc-900/50 border-b border-white/5">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Flow</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Description</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Timestamp</th>
                            <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Delta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  {tx.type === 'in' ? (
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                      <ArrowUpRight className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                      <ArrowDownLeft className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-white uppercase tracking-tighter">{tx.description}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-[10px] font-medium text-zinc-500">
                                  {formatDate(tx.createdAt)}
                                </p>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn(
                                  "text-sm font-bold font-mono tracking-tighter",
                                  tx.type === 'in' ? "text-emerald-500" : "text-red-500"
                                )}>
                                  {tx.type === 'in' ? '+' : '-'}{tx.amount} CR
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <History className="w-12 h-12 text-zinc-800" />
                    <p className="text-sm text-zinc-500 italic">No financial record found.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
