import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  FileText, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Layers,
  MessageSquare,
  Globe,
  Star,
  ChevronRight,
  CreditCard,
  Phone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: <Video className="w-6 h-6" />,
    title: "CineAura",
    description: "Convert ideas into stunning cinematic videos with AI narration and visuals."
  },
  {
    icon: <Play className="w-6 h-6" />,
    title: "ReelAura",
    description: "Generate high-engaging vertical short-form content for TikTok & Reels."
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "ThumbAura",
    description: "Professional high-click-through thumbnails for any platform."
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "ScriptAura",
    description: "Smart scriptwriting engine for viral storytelling across niches."
  }
];

const pricing = [
  {
    name: "Starter",
    price: "৳999",
    credits: "5,000",
    features: ["Standard Support", "Standard Video Quality", "5 GB Storage", "2 Active Projects"],
    popular: false
  },
  {
    name: "Standard",
    price: "৳2,499",
    credits: "15,000",
    features: ["Priority Support", "High Definition Quality", "20 GB Storage", "10 Active Projects", "Advanced Styles"],
    popular: true
  },
  {
    name: "Professional",
    price: "৳5,999",
    credits: "45,000",
    features: ["Dedicated Manager", "Ultra HD Quality", "Unlimited Storage", "Unlimited Projects", "Custom Voice Cloning"],
    popular: false
  }
];

const faqs = [
  {
    q: "How does the narration work?",
    a: "We use advanced neuro-linguistic models to generate a clean, natural storyteller voice in multiple languages including Bangla, Hindi, and English."
  },
  {
    q: "Can I use the videos for YouTube?",
    a: "Yes, once generated, you own the full commercial rights to use your creations on any platform."
  },
  {
    q: "What are credits used for?",
    a: "Credits are used to generate scripts, narration, and cinematic frames. Each feature has a specific credit cost based on complexity."
  }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black italic text-black">A</div>
            <span className="font-black text-xl tracking-tighter uppercase italic">Auurio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-white text-black text-xs font-black uppercase tracking-tighter rounded-full hover:bg-zinc-200 transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest text-orange-500 mb-8"
          >
            <Sparkles className="w-3 h-3" />
            Empowering the Next Gen Creators
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic mb-8"
          >
            Cinematic <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Masterpieces</span> <br />
            in Seconds
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-medium"
          >
            The world's most advanced AI platform for high-quality video production, scriptwriting, and visual storytelling.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => navigate('/login')}
              className="group px-8 py-4 bg-orange-500 text-black font-black uppercase tracking-tighter rounded-2xl flex items-center gap-2 hover:bg-orange-400 transition-all active:scale-95 shadow-2xl shadow-orange-500/20"
            >
              Start Creating Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a 
              href="#features"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              Learn More
            </a>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { label: "Active Users", val: "50k+" },
            { label: "Productions", val: "1.2M" },
            { label: "Hours Saved", val: "500k" },
            { label: "Success Rate", val: "99.9%" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white italic mb-2 tracking-tighter">{stat.val}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">Powerful Suite</h2>
            <p className="text-zinc-500 uppercase font-black tracking-widest text-xs">Everything you need for Content Dominance</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-8 bg-zinc-900/50 rounded-3xl border border-white/5 hover:border-orange-500/20 transition-all">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-black uppercase italic mb-3 tracking-tight">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner / Proof */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <h2 className="text-3xl md:text-5xl font-black text-black uppercase italic tracking-tighter leading-[0.9]">
            Ready to scale your <br /> content game?
          </h2>
          <button 
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-black text-white font-black uppercase tracking-tighter rounded-2xl hover:scale-105 transition-all shadow-2xl active:scale-95"
          >
            Create Your Production
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">Investment Plans</h2>
            <p className="text-zinc-500 uppercase font-black tracking-widest text-xs">Choose the scale that fits your goals</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((p, i) => (
              <div key={i} className={`relative p-8 rounded-3xl border ${p.popular ? 'bg-zinc-900 border-orange-500/50 scale-105 z-10' : 'bg-transparent border-white/5'} flex flex-col`}>
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter">{p.price}</span>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">/ one-time</span>
                  </div>
                  <p className="mt-4 text-orange-500 font-black text-sm">{p.credits} Credits</p>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {p.features.map((feat, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm text-zinc-400">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {feat}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => navigate('/login')}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-tighter transition-all active:scale-95 ${p.popular ? 'bg-orange-500 text-black shadow-xl shadow-orange-500/20' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
                >
                  Purchase Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">Deep Insights</h2>
            <p className="text-zinc-500 uppercase font-black tracking-widest text-xs">Common Questions answered</p>
          </div>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="p-8 bg-zinc-900/30 rounded-3xl border border-white/5">
                <h4 className="font-bold text-lg mb-3 tracking-tight">{f.q}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-8 leading-[0.85]">
              Let's build <br /> something <br /> legendary.
            </h2>
            <p className="text-zinc-400 font-medium mb-10 max-w-md">
              Have a specific project or business requirement? Our team is ready to assist you in scaling your production.
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Support Line</p>
                  <p className="font-bold">+880 1234 567890</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Email Us</p>
                  <p className="font-bold">support@auurio.com</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-10 bg-zinc-900 rounded-[40px] border border-white/5">
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">First Name</label>
                  <input type="text" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-800" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Email Address</label>
                  <input type="email" className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-800" placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 ml-1">Message</label>
                <textarea rows={4} className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 focus:border-orange-500 outline-none transition-all placeholder:text-zinc-800" placeholder="How can we help?"></textarea>
              </div>
              <button className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl">
                Send Inquiry
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6 text-orange-500">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black italic text-black shrink-0">A</div>
                <span className="font-black text-xl tracking-tighter uppercase italic text-white">Auurio</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs mb-8">
                The leading professional AI multimedia production platform for the modern era.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-orange-500 transition-all cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-orange-500 transition-all cursor-pointer">
                   <Star className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-white mb-6">Tools</h5>
              <ul className="space-y-4 text-zinc-500 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">CineAura</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ReelAura</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ThumbAura</a></li>
                <li><a href="#" className="hover:text-white transition-colors">ScriptAura</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-white mb-6">Company</h5>
              <ul className="space-y-4 text-zinc-500 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Manifesto</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-white mb-6">Legal</h5>
              <ul className="space-y-4 text-zinc-500 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] uppercase font-black tracking-widest text-white mb-6">Support</h5>
              <ul className="space-y-4 text-zinc-500 text-sm font-medium">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 gap-6">
            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
              © 2026 Auurio Multimedia Platform. All Rights Reserved.
            </p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-500" />
              <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Enabled</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
