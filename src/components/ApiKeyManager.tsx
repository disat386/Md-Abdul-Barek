import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, Globe, Smartphone } from 'lucide-react';
import { geminiKeyService, ApiKeyEntry } from '../services/geminiKeyService';
import { useFirebase } from './FirebaseProvider';

export const ApiKeyManager = ({ defaultSource = 'local' }: { defaultSource?: 'local' | 'global' }) => {
  const { profile } = useFirebase();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [newKey, setNewKey] = useState('');
  const [source, setSource] = useState<'local' | 'global'>(defaultSource);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    refreshKeys();
    // Set up polling for local keys (global keys are live-synced via onSnapshot in service)
    const timer = setInterval(refreshKeys, 2000);
    return () => clearInterval(timer);
  }, []);

  const refreshKeys = () => {
    setKeys(geminiKeyService.getKeys());
  };

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    await geminiKeyService.addKey(newKey, source);
    setNewKey('');
    refreshKeys();
  };

  const handleRemoveKey = async (id: string) => {
    await geminiKeyService.removeKey(id);
    refreshKeys();
  };

  const handleToggleStatus = async (id: string) => {
    await geminiKeyService.toggleKeyStatus(id);
    refreshKeys();
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
            <Key className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight text-white/80">API Key Rotation</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Manage Your Generation Resources</p>
          </div>
        </div>
        <div className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
          ACTIVE: {keys.filter(k => k.isWorking).length} / TOTAL: {keys.length}
        </div>
      </div>

      {/* Add New Key */}
      <div className="space-y-4 mb-6">
        {isAdmin && (
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
            <button 
              onClick={() => setSource('local')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${source === 'local' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              <Smartphone className="w-3 h-3" /> Local Only
            </button>
            <button 
              onClick={() => setSource('global')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${source === 'global' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-white/40 hover:text-white/60'}`}
            >
              <Globe className="w-3 h-3" /> Global (Admin)
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input 
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={`Paste new ${source} key...`}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
          />
          <button 
            onClick={handleAddKey}
            className={`p-2.5 rounded-xl transition-all shadow-lg ${source === 'global' ? 'bg-orange-500 text-black' : 'bg-blue-600 text-white'}`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Keys List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {keys.map((key) => (
            <motion.div 
              key={key.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-2xl border transition-all ${key.isWorking ? 'bg-white/[0.02] border-white/5' : 'bg-red-500/5 border-red-500/20 opacity-60'}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  {key.source === 'global' ? (
                    <div className="w-5 h-5 rounded bg-orange-500/10 flex items-center justify-center border border-orange-500/20 flex-shrink-0">
                      <Globe className="w-3 h-3 text-orange-500" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                      <Smartphone className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                  <span className="text-[10px] font-mono text-white/60 truncate">
                    {showKeys[key.id] ? key.key : `••••••••••••${key.key.slice(-4)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleShowKey(key.id)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 transition-colors"
                  >
                    {showKeys[key.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button 
                    onClick={() => handleToggleStatus(key.id)}
                    className={`p-1.5 rounded-lg transition-colors ${key.isWorking ? 'text-white/40 hover:bg-white/5' : 'text-blue-400 hover:bg-blue-500/10'}`}
                  >
                    <RefreshCw className={`w-3 h-3 ${!key.isWorking && 'animate-spin'}`} />
                  </button>
                  <button 
                    onClick={() => handleRemoveKey(key.id)}
                    className="p-1.5 hover:bg-red-500/20 text-red-400/60 rounded-lg transition-colors"
                    disabled={key.source === 'global' && !isAdmin}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {key.lastError && !key.isWorking && (
                <div className="text-[9px] text-red-400/80 font-mono mt-1 break-words line-clamp-1 italic">
                   {key.lastError}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-[8px] text-white/20 uppercase tracking-widest font-mono">
                  {key.source === 'global' ? 'Global System Key' : 'Browser Session Key'} • {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString() : 'Never'}
                </div>
                <div className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${key.isWorking ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {key.isWorking ? 'Ready' : 'Limited'}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {keys.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-white/10 border border-dashed border-white/5 rounded-3xl">
            <Key className="w-8 h-8" />
            <p className="text-[10px] uppercase font-mono tracking-widest text-center px-4">Registry Empty</p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
        <p className="text-[9px] text-white/30 font-mono leading-tight">
          * Global keys are shared across all users and managed by administrators.
        </p>
        <p className="text-[9px] text-white/30 font-mono leading-tight">
          * Local keys are specific to this device and override global rotation.
        </p>
      </div>
    </div>
  );
};
