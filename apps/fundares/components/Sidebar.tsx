'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  BarChart3,
  BookOpen,
  LogOut,
  Leaf,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Validación IA', href: '/admin/validacion', icon: ClipboardCheck },
  { label: 'Empresas', href: '/admin/empresas', icon: Building2 },
  { label: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
];

const empresaNav: NavItem[] = [
  { label: 'Dashboard', href: '/empresa/dashboard', icon: LayoutDashboard },
  { label: 'Educación', href: '/empresa/educacion', icon: BookOpen },
  { label: 'Reportes', href: '/empresa/reportes', icon: BarChart3 },
];

interface SidebarProps {
  rol: 'admin' | 'empresa';
  nombre?: string;
}

export function Sidebar({ rol, nombre }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const navItems = rol === 'admin' ? adminNav : empresaNav;

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight">Fundares</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {rol === 'admin' ? 'Panel Administrativo' : 'Portal Empresa'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`sidebar-link ${active ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        {nombre && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 px-4 py-2 truncate">
            {nombre}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-h-screen fixed left-0 top-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-100">Fundares</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 bg-white dark:bg-slate-800 h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
