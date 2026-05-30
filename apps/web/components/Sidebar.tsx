'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, CheckSquare, Building2, BarChart3,
  BookOpen, FileText, LogOut, Recycle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const adminNav = [
  { href: '/admin/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/validacion', label: 'Validación',  icon: CheckSquare },
  { href: '/admin/empresas',   label: 'Empresas',    icon: Building2 },
  { href: '/admin/reportes',   label: 'Reportes',    icon: BarChart3 },
];

const empresaNav = [
  { href: '/empresa/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/empresa/educacion', label: 'Educación',  icon: BookOpen },
  { href: '/empresa/reportes',  label: 'Reportes',   icon: FileText },
];

export function Sidebar({ rol }: { rol: 'admin' | 'empresa' }) {
  const pathname = usePathname();
  const router   = useRouter();
  const nav      = rol === 'admin' ? adminNav : empresaNav;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-60 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
          <Recycle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 dark:text-white">Fundares</p>
          <p className="text-xs text-gray-400 capitalize">{rol}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
