import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 import jwt, { JwtPayload } from 'jsonwebtoken';
type UserRole = "ADMIN" | "DOCTOR" | "PATIENT";
type RouteConfig={
  exact:string[];
  patterns:RegExp[];
}

const authRoutes =["login","register","forgot-password","reset-password"];
const commonProtectedRoutes  :RouteConfig={
  exact: ["/my-profile","/settings"],
  patterns:[]
}

const doctorProtectedRoutes :RouteConfig={
patterns:[/^\/doctor/],
exact: []
}

const adminProtectedRoutes :RouteConfig={
  patterns:[/^\/admin/],
  exact: []
 }

 const patientProtectedRoutes :RouteConfig={
  patterns:[/^\/dashboard/],
  exact: []
 }
const isAuthRoute=(pathname:string)=>{
  return authRoutes.some((route)=> route === pathname);
}

const isRouteMatches =(pathname:string,routes:RouteConfig):boolean=>{
  if(routes.exact.includes(pathname)){
    return  true;
  }
  return routes.patterns.some((pattern:RegExp)=> pattern.test(pathname));
}

const getRouteOwner=(pathname:string):"ADMIN" | "DOCTOR" | "PATIENT" | "COMMON" | null=>{
  if(isRouteMatches(pathname,commonProtectedRoutes)){
    return "COMMON";
  } 
  if(isRouteMatches(pathname,doctorProtectedRoutes)){
    return "DOCTOR";
  } 
  if(isRouteMatches(pathname,adminProtectedRoutes)){
    return "ADMIN";
  }
  if(isRouteMatches(pathname,patientProtectedRoutes)){
    return "PATIENT";
  }
  return null;
}


const getDefaultDashboardRoute=(role:UserRole):string=>{
  if(role==="ADMIN"){
    return "/admin/dashboard";
  }
  if(role==="DOCTOR"){
    return "/doctor/dashboard";
  }
  if(role==="PATIENT"){
    return "/dashboard";
  } 
  return "/";
}
// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
 const pathname = request.nextUrl.pathname;
 const accessToken = request.cookies.get("accessToken")?.value || null;
 let userRole:UserRole | null = null;
 if(accessToken){
  const verifiedToken :JwtPayload | string = jwt.verify(accessToken, process.env.JWT_SECRET as string) 
if(typeof verifiedToken === "string" ){
cookieStore.delete("accessToken");
cookieStore.delete("refreshToken");
return NextResponse.redirect(new URL("/login", request.url));
};
  userRole = verifiedToken.role as UserRole;
 }
  return NextResponse.next()
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known).*)',
  ],
}