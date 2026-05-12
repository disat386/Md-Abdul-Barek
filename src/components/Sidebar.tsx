import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Film, 
  Video, 
  Image as ImageIcon, 
  ScrollText, 
  Settings,
  ShieldCheck,
  Mic
} from 'lucide-react';
import { cn } from '../utils';

interface SidebarProps {
  role?: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/cine', icon: Film, label: 'CineAura' },
    { to: '/voice', icon: Mic, label: 'CineVoice' },
    { to: '/reel', icon: Video, label: 'ReelAura' },
    { to: '/thumb', icon: ImageIcon, label: 'ThumbAura' },
    { to: '/script', icon: ScrollText, label: 'Scripting' },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-white/5 flex flex-col h-full hidden md:flex">
      <div className="p-8">
        <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-black text-xl">A</span>
          </div>
          AUURIO
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 mb-2">Platform</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-orange-500/10 text-orange-500" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}

        {role && role !== 'user' && (
          <>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 mt-8 mb-2">Admin</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-green-500/10 text-green-500" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Admin Hub</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-white/5 mx-4 mb-4">
        <div className="bg-orange-500/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-orange-500 uppercase mb-1">Ecosystem Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-white/80">Systems Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
