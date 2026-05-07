import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Coins, User as UserIcon } from 'lucide-react';
import { formatCredits } from '../utils';

interface NavbarProps {
  user: any;
  profile: any;
}

export default function Navbar({ user, profile }: NavbarProps) {
  return (
    <header className="h-16 md:h-20 bg-zinc-950/50 backdrop-blur-md border-b border-white/5 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-black text-xl font-black">A</span>
          </div>
        </div>
        <h2 className="text-zinc-400 font-medium hidden sm:block">
          Welcome back, <span className="text-white">{user.displayName?.split(' ')[0]}</span>
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-zinc-900 border border-white/5 rounded-full">
          <Coins className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs md:text-sm font-bold text-white tabular-nums">{formatCredits(profile?.credits || 0)}</span>
          <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Credits</span>
        </div>

        <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-bold text-white leading-tight truncate max-w-[100px]">{user.displayName}</p>
            <p className="text-[8px] md:text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-tight">{profile?.role}</p>
          </div>
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <UserIcon className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
            </div>
          )}
          
          <button 
            onClick={() => signOut(auth)}
            className="p-1.5 md:p-2 text-zinc-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
