import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Redirect API requests from oscarlimerick.com/api/* to order.oscarlimerick.com/api/*
  // This handles requests like: 
  // - oscarlimerick.com/api/food-menu -> order.oscarlimerick.com/api/food-menu
  // - www.oscarlimerick.com/api/food-menu -> order.oscarlimerick.com/api/food-menu
  if (
    url.pathname.startsWith('/api/') && 
    hostname.includes('oscarlimerick.com') && 
    !hostname.includes('order.oscarlimerick.com')
  ) {
    // Extract the API path after /api/ (everything after /api/)
    const apiPath = url.pathname.substring(5); // Remove '/api/' prefix
    
    // Build redirect URL preserving query parameters and hash
    const redirectUrl = `https://order.oscarlimerick.com/api/${apiPath}${url.search}${url.hash}`;
    
    return NextResponse.redirect(redirectUrl, 301);
  }

  return NextResponse.next();
}

// Run middleware on all API routes
export const config = {
  matcher: '/api/:path*',
};
