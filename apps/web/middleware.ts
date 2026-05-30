import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:    () => request.cookies.getAll(),
        setAll: (pairs) => pairs.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Public paths
  if (path.startsWith('/api/webhook') || path === '/login') {
    return response;
  }

  // Not authenticated → login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Get role
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  const rol = perfil?.rol as 'admin' | 'empresa' | undefined;

  // Wrong role → redirect to own dashboard
  if (path.startsWith('/admin') && rol !== 'admin') {
    return NextResponse.redirect(new URL('/empresa/dashboard', request.url));
  }

  if (path.startsWith('/empresa') && rol !== 'empresa') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Root → redirect to dashboard
  if (path === '/') {
    const dest = rol === 'admin' ? '/admin/dashboard' : '/empresa/dashboard';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
