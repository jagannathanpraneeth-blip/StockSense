import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { getHealth } from '../../api/client';
interface HeaderProps { onToggleMobile: () => void; pageTitle: string }
export const Header: React.FC<HeaderProps> = ({ onToggleMobile, pageTitle }) => {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const check = async () => { try { await getHealth(); if (active) setOnline(true); } catch { if (active) setOnline(false); } };
    check(); const timer = setInterval(check, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200 gap-3">
    <div className="flex items-center gap-3 min-w-0"><button onClick={onToggleMobile} aria-label="Open sidebar" className="lg:hidden p-2 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5" /></button><h1 className="font-bold text-slate-900 truncate">{pageTitle}</h1></div>
    <span role="status" className={`shrink-0 text-xs ${online === false ? 'text-rose-600' : 'text-slate-500'}`}>{online === null ? 'Connecting…' : online ? 'Connected' : 'Connection lost'}</span>
  </header>;
};
