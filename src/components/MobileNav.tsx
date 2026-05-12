import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Film, 
  Video, 
  ImageIcon, 
  ScrollText,
  Mic
} from 'lucide-react';
import { cn } from '../utils';

export default function MobileNav() {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: '/cine', icon: Film, label: 'Cine' },
    { to: '/voice', icon: Mic, label: 'Voice' },
    { to: '/reel', icon: Video, label: 'Reel' },
    { to: '/thumb', icon: ImageIcon, label: 'Thumb' },
    { to: '/script', icon: ScrollText, label: 'Script' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-white/5 px-2 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 relative",
              isActive 
                ? "text-orange-500" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                {/* Active Indicator */}
                <div className={cn(
                  "absolute top-0 w-8 h-1 bg-orange-500 rounded-b-full transition-all duration-300",
                  isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                )} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
