/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { 
  Headphones, 
  Video, 
  Image as ImageIcon, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  ChevronRight, 
  Menu, 
  X,
  LogOut,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  Layers,
  Newspaper,
  FlaskConical,
  PenTool,
  Workflow,
  Megaphone,
  Search,
  Mail
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useFirebase } from './components/FirebaseProvider';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { BillingModal } from './components/BillingModal';
import { ChatBot } from './components/ChatBot';
import { GeminiLab } from './components/GeminiLab';
import { ProfileModal } from './components/ProfileModal';
import { FeedbackModal } from './components/FeedbackModal';
import { MessageSquare } from 'lucide-react';
import { db } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';

// Pages
import Documentation from './pages/Documentation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SecurityAudit from './pages/SecurityAudit';
import Status from './pages/Status';
import AdminPage from './pages/AdminPage';
import Contact from './pages/Contact';

// --- PREVIEW LINKS CONFIGURATION ---
// Replace these with your actual AI Studio Preview URLs (.run.app)
const PREVIEW_LINKS = {
  audiobook: 'https://audiobook.auurio.com',
  motion: 'https://ais-pre-f5hb6v5saipeg6gnxnp35p-7801728734.asia-southeast1.run.app',
  marketra: 'https://ais-pre-8b4f02ddb21bb2d198fb0a42cb5b8dd1-7801728734.asia-southeast1.run.app',
  news: 'https://newslite.auurio.com/',
  lab: 'https://lab-preview.run.app'
};

const tools = [
  {
    id: 'audiobook-aura',
    name: 'Audiobook Aura',
    description: 'High-fidelity AI narration engine for transforming manuscripts into studio-quality audio experiences with emotive voice synthesis.',
    icon: Headphones,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    url: PREVIEW_LINKS.audiobook,
    subdomain: 'audiobook.auurio.com'
  },
  {
    id: 'auurio-motion',
    name: 'Auurio Motion',
    description: 'Cinematic AI animation pipeline for creating professional-grade motion graphics and visual storytelling in seconds.',
    icon: Sparkles,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    url: PREVIEW_LINKS.motion,
    subdomain: 'motion.auurio.com'
  },
  {
    id: 'auurio-marketra',
    name: 'Auurio Marketra',
    description: 'High-performance AI engine for technical SEO optimization, viral marketing automation, and strategic content insights.',
    icon: Megaphone,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    url: PREVIEW_LINKS.marketra,
    subdomain: 'market.auurio.com'
  },
  {
    id: 'newslite',
    name: 'NewsLite',
    description: 'Hyper-personalized AI news aggregator that curates real-time industrial intelligence and global briefings tailored to user interests.',
    icon: Newspaper,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    url: PREVIEW_LINKS.news,
    subdomain: 'news.auurio.com'
  },
  {
    id: 'contentlab',
    name: 'ContentLab',
    description: 'Professional long-form content workspace specializing in deep research, precision drafting, and iterative AI-assisted writing.',
    icon: PenTool,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    url: PREVIEW_LINKS.lab,
    subdomain: 'lab.auurio.com'
  }
];

export default function App() {
  const { user, profile, loading, login, logout } = useFirebase();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const pkgSnap = await getDocs(collection(db, 'packages'));
        setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching packages:", error);
      }
    };
    fetchPackages();
  }, []);

  const toolsWithSSO = tools.map(tool => {
    const ssoParams = new URLSearchParams();
    if (user) {
      ssoParams.set('sso', 'true');
      ssoParams.set('email', user.email || '');
      ssoParams.set('db', firebaseConfig.firestoreDatabaseId || '');
    }
    const url = ssoParams.toString() ? `${tool.url}?${ssoParams.toString()}` : tool.url;
    return { ...tool, url };
  });

  const filteredTools = toolsWithSSO.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!user) {
      setUsageLogs([]);
      return;
    }

    const q = query(
      collection(db, 'usage_logs'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsageLogs(logs);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPurchaseHistory([]);
      return;
    }

    const q = query(
      collection(db, 'purchase_history'),
      where('uid', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPurchaseHistory(history);
    });

    return () => unsubscribe();
  }, [user]);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-white font-display font-medium tracking-[0.5em] text-sm uppercase"
        >
          Auurio
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {/* Visual Enhancements */}
      <div className="atmosphere" />
      <div className="fixed inset-0 bg-grid-white pointer-events-none z-[1]" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[150px] pointer-events-none rounded-full" />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="fixed bottom-8 left-8 z-[50] group bg-zinc-900 border border-white/10 text-white/70 hover:text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:bg-zinc-800 transition-all hover:-translate-y-1"
      >
        <MessageSquare className="w-5 h-5 group-hover:text-pink-500 transition-colors" />
        <span className="font-medium text-sm">Feedback</span>
      </button>

      <ChatBot />
      <nav className="fixed top-0 w-full z-[60] border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-orange-500 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-0 transition-transform duration-500">
                <Zap className="w-6 h-6 text-black fill-current" />
              </div>
              <span className="text-2xl font-display font-bold tracking-tight">Auurio</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <div className="relative group/menu">
              <button className="flex items-center gap-1 hover:text-white transition-colors">
                Tools <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
              <div className="absolute top-full left-0 mt-4 w-64 p-4 bg-black/90 border border-white/10 rounded-2xl backdrop-blur-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-300">
                <div className="grid gap-2">
                  {toolsWithSSO.map(tool => (
                    <a key={tool.id} href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={`w-8 h-8 ${tool.bg} rounded-lg flex items-center justify-center`}>
                        <tool.icon className={`w-4 h-4 ${tool.color}`} />
                      </div>
                      <span className="text-xs text-white/80">{tool.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            {user && (
              <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
            )}
            {isAdmin && (
              <button 
                onClick={() => setIsLabOpen(true)} 
                className="flex items-center gap-2 text-orange-500 hover:text-white transition-colors font-bold uppercase text-[10px] tracking-widest"
              >
                <Sparkles className="w-3 h-3" /> Gemini Lab
              </button>
            )}
            <a href="#features" className="hover:text-white transition-colors">Ecosystem</a>
            <button onClick={() => setIsBillingOpen(true)} className="hover:text-white transition-colors">Credits</button>
            <Link to="/contact" className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-orange-500 hover:text-black hover:border-orange-500 transition-all font-bold text-[10px] uppercase tracking-widest">Connect</Link>
            {user ? (
              <div className="flex items-center gap-4 pl-8 border-l border-white/10">
                {isAdmin && (
                  <Link 
                    to="/admin"
                    className="text-xs font-bold uppercase tracking-wider text-orange-500 hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex flex-col items-end">
                  <button 
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 group/profile"
                  >
                    <div className="flex flex-col items-end">
                      <span className="text-white group-hover/profile:text-orange-500 transition-colors uppercase text-[10px] tracking-widest font-bold">
                        {profile?.displayName || 'User'}
                      </span>
                      <span className="text-[10px] text-orange-500 uppercase tracking-wider font-bold">
                        {profile?.credits} Credits
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-white/5">
                      <img 
                        src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </button>
                </div>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                >
                  <LogOut className="w-5 h-5 group-hover:text-orange-500 transition-colors" />
                </button>
              </div>
            ) : (
              <button 
                id="auth-button"
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-white text-black px-6 py-2 rounded-full hover:bg-orange-500 hover:text-white transition-all duration-300"
              >
                Get Started
              </button>
            )}
          </div>

          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden bg-black pt-24 px-6"
          >
            <div className="flex flex-col gap-6 text-xl font-medium">
              <div className="py-4 border-b border-white/10">
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-4">Tools</div>
                <div className="grid gap-4">
                  {tools.map(tool => (
                    <a 
                      key={tool.id} 
                      href={tool.url}
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-4"
                    >
                      <div className={`w-10 h-10 ${tool.bg} rounded-xl flex items-center justify-center`}>
                        <tool.icon className={`w-5 h-5 ${tool.color}`} />
                      </div>
                      <span>{tool.name}</span>
                    </a>
                  ))}
                </div>
              </div>
              
              {user && (
                <a href="#dashboard" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-500 transition-colors">Dashboard</a>
              )}
              {isAdmin && (
                <button 
                  onClick={() => { setIsLabOpen(true); setIsMenuOpen(false); }} 
                  className="text-left text-orange-500 hover:text-white transition-colors font-bold uppercase text-sm tracking-widest flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Gemini Lab
                </button>
              )}
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="hover:text-orange-500 transition-colors">Ecosystem</a>
              <button onClick={() => { setIsBillingOpen(true); setIsMenuOpen(false); }} className="text-left hover:text-orange-500 transition-colors">Credits</button>
              
              <div className="mt-auto pb-12">
                {isAdmin && (
                  <Link 
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full mb-4 py-3 rounded-xl bg-orange-500/10 text-orange-500 font-bold uppercase tracking-wider text-sm border border-orange-500/20 block text-center"
                  >
                    Admin Dashboard
                  </Link>
                )}
                {user ? (
                  <div className="space-y-3">
                    <button 
                      onClick={() => { setIsProfileOpen(true); setIsMenuOpen(false); }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-orange-500/30 overflow-hidden">
                          <img 
                            src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                            alt="Mobile Profile" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{profile?.displayName || 'User'}</div>
                          <div className="text-[10px] text-orange-500 uppercase tracking-wider">{profile?.credits} Credits</div>
                        </div>
                      </div>
                      <UserIcon className="w-4 h-4 text-white/20 group-hover:text-orange-500 transition-colors" />
                    </button>
                    <button onClick={logout} className="w-full p-4 rounded-2xl bg-red-500/10 text-red-500 text-sm font-bold flex items-center justify-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}
                    className="w-full bg-orange-500 text-black py-4 rounded-2xl font-bold"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/security" element={<SecurityAudit />} />
        <Route path="/status" element={<Status />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/" element={
          <>
      {/* Hero Section */}
      <header className="relative pt-64 pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div id="hero-section" className="grid lg:grid-cols-2 gap-32 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15,
                    delayChildren: 0.3
                  }
                }
              }}
            >
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10"
              >
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Unified AI Ecosystem</span>
              </motion.div>
              
              <motion.h1 
                variants={{
                  hidden: { opacity: 0, y: 50, letterSpacing: "-0.05em" },
                  visible: { opacity: 1, y: 0, letterSpacing: "-0.02em", transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="text-8xl lg:text-[10rem] font-display font-black leading-[0.82] tracking-tighter mb-10"
              >
                THE NEXT <br />
                <span className="text-orange-500 italic block mt-2">GEN</span> ERA
              </motion.h1>
              
              <motion.p 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } }
                }}
                className="text-xl text-white/40 leading-relaxed max-w-lg mb-12 font-light"
              >
                A high-performance hub for technical AI production. Engineering the future with studio-quality audio, cinematic motion, and data-driven market intelligence.
              </motion.p>
              
              <motion.div 
                variants={{
                  hidden: { opacity: 0, scale: 0.95 },
                  visible: { opacity: 1, scale: 1 }
                }}
                className="flex flex-wrap gap-4"
              >
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-12 py-6 bg-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-white transition-all duration-500 shadow-2xl shadow-orange-500/20"
                >
                  Enter Ecosystem
                </motion.button>
                <motion.a 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  href="#tools"
                  className="px-12 py-6 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-white/10 transition-all duration-300 backdrop-blur-md"
                >
                  Explore Tech
                </motion.a>
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 bg-orange-500/20 blur-[120px] rounded-full animate-pulse" />
              <div className="relative aspect-square glass-card rounded-[5rem] group overflow-hidden shadow-orange-500/10 shadow-2xl">
                <div className="absolute inset-0 bg-grid-white opacity-20" />
                <img 
                  src="https://picsum.photos/seed/tech-future-2/1200/1200" 
                  alt="AI Hub"
                  className="w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-[2000ms]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                
                <div className="absolute bottom-12 left-12 right-12 p-10 glass-card rounded-[2.5rem] border-white/20">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <Layers className="w-7 h-7 text-black fill-current" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg">System Ready</h4>
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Global SSO Active</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "easeInOut" }}
                      className="h-full bg-orange-500 shadow-[0_0_15px_rgba(242,125,38,0.8)]" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Tools Section */}
      <section id="tools" className="py-48 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-24">
            <div>
              <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 flex items-center gap-3">
                <div className="w-8 h-px bg-orange-500/30" />
                Production Protocols
              </div>
              <h2 className="text-6xl lg:text-8xl font-display font-black tracking-tight uppercase">AI FORGE</h2>
            </div>
            <div className="relative group max-w-sm w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-orange-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Initialize search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white/10 transition-all font-light tracking-wide backdrop-blur-md"
              />
            </div>
          </div>

          {filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredTools.map((tool, idx) => (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  onMouseEnter={() => setHoveredToolId(tool.id)}
                  onMouseLeave={() => setHoveredToolId(null)}
                  className="relative group h-full"
                >
                  <div className="h-full glass-card rounded-[3rem] p-12 hover:border-orange-500/50 transition-all duration-700 flex flex-col hover:-translate-y-4 group overflow-hidden border-white/5">
                    <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                      <ArrowRight className="w-8 h-8 text-orange-500 -rotate-45 group-hover:rotate-0 transition-transform duration-700" />
                    </div>
                    
                    <div className={`w-20 h-20 ${tool.bg} rounded-[2rem] flex items-center justify-center mb-12 group-hover:scale-110 transition-transform duration-700 shadow-2xl shadow-black/40 border border-white/10`}>
                      <tool.icon className={`w-10 h-10 ${tool.color}`} />
                    </div>
                    
                    <h3 className="text-3xl font-display font-bold mb-5 tracking-tight">{tool.name}</h3>
                    <p className="text-sm text-white/40 leading-relaxed mb-12 flex-1 font-light italic">
                      "{tool.description}"
                    </p>
                    
                    <div className="pt-10 border-t border-white/5 flex items-center justify-between">
                      <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">{tool.subdomain}</div>
                      <a 
                        href={tool.url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-white transition-all bg-orange-500/5 px-4 py-2 rounded-full border border-orange-500/20"
                      >
                        Launch
                      </a>
                    </div>
                  </div>

                  <AnimatePresence>
                    {hoveredToolId === tool.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-40 -top-8 left-12 right-12 p-8 glass-card rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] pointer-events-none"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles className="w-4 h-4 text-orange-500" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Protocol Spec</span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                          Synchronized session active. Optimized for studio-grade results using edge-AI deployment.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 glass-card rounded-[4rem]">
              <Search className="w-20 h-20 text-white/10 mx-auto mb-8 animate-pulse" />
              <h3 className="text-2xl font-display font-bold mb-4 tracking-tight uppercase">Protocol Not Found</h3>
              <p className="text-white/30 max-w-sm mx-auto font-light">Unable to locate your search string in the forge repository.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-10 px-8 py-4 bg-white/5 border border-white/10 text-orange-500 hover:text-white transition-all rounded-2xl text-xs font-black uppercase tracking-[0.2em]"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Detailed Protocol Briefs */}
      <section className="py-48 relative z-10 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-32">
            <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 inline-block">Deep Technical Overview</div>
            <h2 className="text-6xl lg:text-7xl font-display font-black tracking-tight uppercase mb-10">PROTOCOL <span className="text-orange-500">SPECIFICATIONS</span></h2>
            <p className="text-white/40 max-w-2xl font-light leading-relaxed">
              Every tool in the Auurio ecosystem is built on proprietary AI architectures, tuned for professional-grade reliability and synchronized through a unified compute ledger.
            </p>
          </div>

          <div className="space-y-10">
            {tools.map((tool, idx) => (
              <motion.div 
                key={tool.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card p-12 lg:p-16 rounded-[4rem] border-white/5 hover:bg-white/[0.03] transition-all group"
              >
                <div className="grid lg:grid-cols-3 gap-12 items-center">
                  <div className="flex items-center gap-8">
                    <div className={`w-24 h-24 ${tool.bg} rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl shadow-black group-hover:scale-105 transition-transform duration-500`}>
                      <tool.icon className={`w-10 h-10 ${tool.color}`} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display font-black tracking-tight uppercase mb-2">{tool.name}</h3>
                      <div className="text-[10px] font-mono text-orange-500/60 uppercase tracking-widest">{tool.subdomain}</div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-white/40 text-lg leading-relaxed font-light italic mb-8">
                      {tool.description}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Architecture</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Neural Core V4</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Latency</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Sub-100ms In-Proc</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Output Fidelity</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Production Grade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Protocol Briefs */}
      <section className="py-48 relative z-10 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-32">
            <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 inline-block">Deep Technical Overview</div>
            <h2 className="text-6xl lg:text-7xl font-display font-black tracking-tight uppercase mb-10">PROTOCOL <span className="text-orange-500">SPECIFICATIONS</span></h2>
            <p className="text-white/40 max-w-2xl font-light leading-relaxed">
              Every tool in the Auurio ecosystem is built on proprietary AI architectures, tuned for professional-grade reliability and synchronized through a unified compute ledger.
            </p>
          </div>

          <div className="space-y-10">
            {tools.map((tool, idx) => (
              <motion.div 
                key={tool.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card p-12 lg:p-16 rounded-[4rem] border-white/5 hover:bg-white/[0.03] transition-all group"
              >
                <div className="grid lg:grid-cols-3 gap-12 items-center">
                  <div className="flex items-center gap-8">
                    <div className={`w-24 h-24 ${tool.bg} rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl shadow-black group-hover:scale-105 transition-transform duration-500`}>
                      <tool.icon className={`w-10 h-10 ${tool.color}`} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display font-black tracking-tight uppercase mb-2">{tool.name}</h3>
                      <div className="text-[10px] font-mono text-orange-500/60 uppercase tracking-widest">{tool.subdomain}</div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-white/40 text-lg leading-relaxed font-light italic mb-8">
                      {tool.description}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Architecture</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Neural Core V4</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Latency</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Sub-100ms In-Proc</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Output Fidelity</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Production Grade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Protocol Briefs */}
      <section className="py-48 relative z-10 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-32">
            <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 inline-block">Deep Technical Overview</div>
            <h2 className="text-6xl lg:text-7xl font-display font-black tracking-tight uppercase mb-10">PROTOCOL <span className="text-orange-500">SPECIFICATIONS</span></h2>
            <p className="text-white/40 max-w-2xl font-light leading-relaxed">
              Every tool in the Auurio ecosystem is built on proprietary AI architectures, tuned for professional-grade reliability and synchronized through a unified compute ledger.
            </p>
          </div>

          <div className="space-y-10">
            {tools.map((tool, idx) => (
              <motion.div 
                key={tool.id}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass-card p-12 lg:p-16 rounded-[4rem] border-white/5 hover:bg-white/[0.03] transition-all group"
              >
                <div className="grid lg:grid-cols-3 gap-12 items-center">
                  <div className="flex items-center gap-8">
                    <div className={`w-24 h-24 ${tool.bg} rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl shadow-black group-hover:scale-105 transition-transform duration-500`}>
                      <tool.icon className={`w-10 h-10 ${tool.color}`} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-display font-black tracking-tight uppercase mb-2">{tool.name}</h3>
                      <div className="text-[10px] font-mono text-orange-500/60 uppercase tracking-widest">{tool.subdomain}</div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-white/40 text-lg leading-relaxed font-light italic mb-8">
                      {tool.description}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Architecture</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Neural Core V4</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Latency</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Sub-100ms In-Proc</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Output Fidelity</div>
                        <div className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Production Grade</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem Features */}
      <section id="features" className="py-48 relative overflow-hidden z-10 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-8">System Architecture</div>
            <h2 className="text-6xl lg:text-7xl font-display font-black tracking-tight mb-12 uppercase">Seamless <br />Integration.</h2>
            <div className="space-y-12">
              {[
                { 
                  icon: ShieldCheck, 
                  title: "Global SSO", 
                  desc: "Sync your identity across all Auurio protocols instantly.", 
                  color: "text-orange-500", 
                  bg: "bg-orange-500/10" 
                },
                { 
                  icon: CreditCard, 
                  title: "Unified Ledger", 
                  desc: "A single credit pool powers every generation in the ecosystem.", 
                  color: "text-blue-400", 
                  bg: "bg-blue-400/10" 
                },
                { 
                  icon: Workflow, 
                  title: "Shared Core", 
                  desc: "Your data and preferences follow you to every specialized tool.", 
                  color: "text-emerald-400", 
                  bg: "bg-emerald-400/10" 
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="flex gap-8 group"
                >
                  <div className={`flex-shrink-0 w-16 h-16 rounded-[1.25rem] ${feature.bg} flex items-center justify-center border border-white/5 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <div>
                    <h4 className="text-xl font-display font-bold mb-3">{feature.title}</h4>
                    <p className="text-sm text-white/40 leading-relaxed font-light">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative aspect-square">
            <div className="absolute inset-0 bg-orange-500/15 blur-[120px] rounded-full animate-pulse" />
            <div className="relative h-full w-full glass-card rounded-[4rem] overflow-hidden flex items-center justify-center p-12">
              <div className="absolute inset-0 bg-grid-white opacity-10" />
              <div className="grid grid-cols-3 gap-6 w-full">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      opacity: [0.1, 0.4, 0.1],
                      scale: [0.95, 1, 0.95],
                      backgroundColor: i === 4 ? ["rgba(242,125,38,0.1)", "rgba(242,125,38,0.3)", "rgba(242,125,38,0.1)"] : "rgba(255,255,255,0.05)"
                    }}
                    transition={{ 
                      duration: 4, 
                      delay: i * 0.15, 
                      repeat: Infinity 
                    }}
                    className="aspect-square rounded-2xl border border-white/5 flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </motion.div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-32 h-32 rounded-[2.5rem] bg-orange-500 flex items-center justify-center shadow-[0_0_80px_rgba(242,125,38,0.4)] rotate-12"
                >
                  <Zap className="w-16 h-16 text-black fill-current" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Dashboard */}
      {user && (
        <section id="dashboard" className="py-48 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
              <div>
                <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6">User Telemetry</div>
                <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tight uppercase">MISSION LOG</h2>
              </div>
              <div className="flex gap-6">
                <div className="px-10 py-8 rounded-[2rem] glass-card border-white/5 text-center min-w-[200px]">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Available Credits</div>
                  <div className="text-4xl font-display font-black text-orange-500">{profile?.credits}</div>
                </div>
                <div className="px-10 py-8 rounded-[2rem] glass-card border-white/5 text-center min-w-[200px]">
                  <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Authentication</div>
                  <div className="text-xl font-display font-bold uppercase tracking-tight text-white/80">{profile?.subscriptionPlan}</div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[3rem] border-white/5 overflow-hidden">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Protocol</th>
                      <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Action</th>
                      <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Delta</th>
                      <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">TIMESTAMP_UTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {usageLogs.length > 0 ? (
                      usageLogs.map((log) => {
                        const tool = tools.find(t => t.id === log.toolId) || {
                          name: log.toolId,
                          icon: Layers,
                          color: 'text-white/40',
                          bg: 'bg-white/5'
                        };
                        return (
                          <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="p-8">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 ${tool.bg} rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform`}>
                                  <tool.icon className={`w-5 h-5 ${tool.color}`} />
                                </div>
                                <span className="font-display font-medium text-lg">{tool.name}</span>
                              </div>
                            </td>
                            <td className="p-8 text-white/40 font-light">{log.action}</td>
                            <td className="p-8 text-orange-500 font-mono font-bold">-{log.creditsUsed}</td>
                            <td className="p-8 text-white/20 font-mono text-xs">
                              {log.timestamp?.toDate ? log.timestamp.toDate().toISOString().replace('T', ' ').split('.')[0] : 'INITIALIZING...'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-24 text-center text-white/10 font-mono text-xs tracking-widest uppercase italic">
                          No Telemetry Data Available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-32">
              <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
                <div>
                  <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6">Financial Ledger</div>
                  <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tight uppercase">PURCHASE HISTORY</h2>
                </div>
              </div>

              <div className="glass-card rounded-[3rem] border-white/5 overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Package</th>
                        <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Amount</th>
                        <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Transaction ID</th>
                        <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">Status</th>
                        <th className="p-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">TIMESTAMP_UTC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {purchaseHistory.length > 0 ? (
                        purchaseHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="p-8">
                              <span className="font-display font-bold text-lg text-white/80">{item.packageName}</span>
                            </td>
                            <td className="p-8 text-white/60 font-mono">৳{item.amountPaid}</td>
                            <td className="p-8 text-white/40 font-mono text-xs">{item.transactionId}</td>
                            <td className="p-8">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                item.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                item.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-8 text-white/20 font-mono text-xs">
                              {item.timestamp?.toDate ? item.timestamp.toDate().toISOString().replace('T', ' ').split('.')[0] : 'PROCESSING...'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-24 text-center text-white/10 font-mono text-xs tracking-widest uppercase italic">
                            No Transaction Records Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section id="billing" className="py-48 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 text-center mb-32">
          <div className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-6 inline-block">Acquisition Model</div>
          <h2 className="text-6xl lg:text-8xl font-display font-black tracking-tight mb-8 uppercase">GLOBAL CREDITS</h2>
          <p className="text-white/40 max-w-xl mx-auto font-light leading-relaxed">
            One subscription for the entire ecosystem. Credits are shared across all protocols with synchronized ledger distribution.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
          {packages.length > 0 ? packages.map((plan, idx) => (
            <motion.div 
              key={plan.id}
              whileHover={{ y: -10 }}
              className={`relative p-12 rounded-[3.5rem] border ${idx === 1 ? 'border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/10' : 'border-white/5 bg-white/[0.02]'} flex flex-col transition-all duration-500 glass-card`}
            >
              {idx === 1 && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-orange-500 text-black text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">
                  Mission Preferred
                </div>
              )}
              <div className="mb-12">
                <h3 className="text-2xl font-display font-bold mb-4 tracking-tight uppercase text-white/60">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display font-black">৳{plan.price}</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold">/ Project</span>
                </div>
              </div>
              <div className="mb-12 space-y-5 flex-grow font-light">
                <div className="flex items-center gap-3 text-orange-500 font-display font-bold text-lg mb-8">
                  <Zap className="w-5 h-5 fill-current" />
                  <span>{plan.credits} Credits</span>
                </div>
                {(plan.features || ['Access to all Auurio tools', 'Priority generation speed', 'Commercial rights included']).map((feature: string, fIdx: number) => (
                  <div key={fIdx} className="flex items-center gap-4 text-xs text-white/50 leading-relaxed group">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-orange-500 transition-colors" />
                    {feature}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => {
                  if (!user) {
                    setIsAuthModalOpen(true);
                  } else {
                    setIsBillingOpen(true);
                  }
                }}
                className={`w-full py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-500 ${
                  idx === 1 
                    ? 'bg-orange-500 text-black hover:bg-white shadow-xl shadow-orange-500/20' 
                    : 'bg-white/5 text-white hover:bg-orange-500 hover:text-black border border-white/10'
                }`}
              >
                Acquire →
              </button>
            </motion.div>
          )) : (
            <div className="col-span-3 text-center text-white/10 py-32 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">
              Syncing Ledger Data...
            </div>
          )}
        </div>
      </section>

          <BillingModal isOpen={isBillingOpen} onClose={() => setIsBillingOpen(false)} />
          <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          <GeminiLab isOpen={isLabOpen} onClose={() => setIsLabOpen(false)} />
        </>
      } />
    </Routes>

    {/* Footer */}
    <footer className="py-32 px-6 relative overflow-hidden z-10 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-20 items-start mb-32">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-10 group">
              <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-orange-500/20">
                <Zap className="w-6 h-6 text-black fill-current" />
              </div>
              <span className="text-3xl font-display font-black tracking-tight">Auurio</span>
            </div>
            <p className="text-white/30 max-w-sm font-light leading-relaxed mb-10">
              The unified AI production ecosystem. Engineering the future of creative output through decentralized toolsets and centralized value. Led by Abdul Barek (DIsat).
            </p>
            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.open('mailto:disat@auurio.com')}>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-orange-500/10 group-hover:border-orange-500/20 transition-all">
                  <Mail className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Founders Mail</div>
                  <div className="text-xs text-white/50 group-hover:text-white transition-colors">disat@auurio.com</div>
                </div>
              </div>
              <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.open('mailto:help@auurio.com')}>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">Support Desk</div>
                  <div className="text-xs text-white/50 group-hover:text-white transition-colors">help@auurio.com</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-10">Protocols</h5>
            <div className="grid gap-4">
              {tools.map(tool => (
                <a key={tool.id} href={tool.url} className="text-xs text-white/40 hover:text-white transition-colors font-light tracking-wide">{tool.name}</a>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-10">Network</h5>
            <div className="grid gap-4 text-xs text-white/40 font-light tracking-wide">
              <Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link>
              <Link to="/documentation" className="hover:text-white transition-colors">Documentation</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Protocol</Link>
              <Link to="/security" className="hover:text-white transition-colors">Security Audit</Link>
              <Link to="/status" className="hover:text-white transition-colors">Status</Link>
            </div>
          </div>
        </div>
        
        <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-[10px] font-mono text-white/10 uppercase tracking-[0.2em]">
            © 2026 Auurio Ecosystem // Abdul Barek (DIsat) // All systems operational
          </div>
          <div className="flex items-center gap-10 font-mono text-[10px] text-white/20">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-green-500" />
              Latency: 24ms
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              Uptime: 99.99%
            </div>
          </div>
        </div>
      </div>
    </footer>
    </div>
  );
}

