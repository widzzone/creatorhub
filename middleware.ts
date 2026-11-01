import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/join', '/api/register', '/auth'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Link recruitment lama: https://domain/?campaign=<ID> → /join/<ID>
  const legacyCampaign = url.searchParams.get('campaign');
  if (url.pathname === '/' && legacyCampaign) {
    return NextResponse.redirect(new URL(`/join/${encodeURIComponent(legacyCampaign)}`, request.url));
  }

  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
  if (!user && !isPublic) {
    const login = new URL('/login', request.url);
    if (url.pathname !== '/') login.searchParams.set('next', url.pathname + url.search);
    return NextResponse.redirect(login);
  }
  if (user && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
