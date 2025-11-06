import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import { userInterface } from "./types/userTypes";



const roleBasedRoutes = {
  ADMIN: ["/admin/dashboard",],
  DOCTOR: ["/doctor/dashboard"],
  PATIENT: [
    "/patient/dashboard",
    "/patient/appointments",
    "/patient/medical-records",
  ],
};

const autRoutes = ["/login", "/register", "/forgot-password"];
// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const { pathname } = request.nextUrl;
  if (!accessToken && !refreshToken && !autRoutes.includes(pathname)) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }

  let user: userInterface | null = null;

  if (accessToken) {
    try {
      user = jwtDecode(accessToken);
    } catch (err) {
      console.log("error decoding access token", err);
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url)
      );
    }

    if (!user && refreshToken) {
      try {
        const refreshRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          }
        );

        if (refreshRes.ok) {
          const newAccessToken = request.cookies.get("accessToken")?.value;
          user = jwtDecode(newAccessToken!);
          return NextResponse.next();
        } else {
          const response = NextResponse.redirect(
            new URL(`/login?redirect=${pathname}`, request.url)
          );
          response.cookies.delete("accessToken");
          response.cookies.delete("refreshToken");
          return response;
        }
      } catch (err) {
        console.log("error refreshing token", err);
        const response = NextResponse.redirect(
          new URL(`/login?redirect=${pathname}`, request.url)
        );
        response.cookies.delete("accessToken");
        response.cookies.delete("refreshToken");
        return response;
      }
    }


   if (user) {
      const allowedRoutes = roleBasedRoutes[user.role]; 
      if (allowedRoutes && allowedRoutes.some((r) => pathname.startsWith(r))) {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(new URL(`/unauthorized`, request.url));
      }
    }

   if(user && autRoutes.includes(pathname)){
    return NextResponse.redirect(new URL(`/`));
   }
   
      // If a logged-in user attempts to open an auth page (login/register),
    // redirect them to the home page (or dashboard) since they are already signed in.
    if (user && autRoutes.includes(pathname)) {
        return NextResponse.redirect(new URL(`/`));
    }
    return NextResponse.next();
  }
}
// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/admin/dashboard/:path*", "/login", "/register", "/forgot-password"],
};
