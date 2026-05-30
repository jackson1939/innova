import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user.id).single();
  if (perfil?.rol !== 'admin') redirect('/empresa/dashboard');

  return (
    <div className="flex min-h-screen">
      <Sidebar rol="admin" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
