## PH-HEALTHCARE-FRONTEND-PART-3

- GitHub Link: https://github.com/Apollo-Level2-Web-Dev/ph-health-care/tree/part-3

## 67-1 Refactoring proxy.ts part-1, 67-2 Refactoring proxy.ts part-2

- login sets the cookie and then using the token we will fetch the user details from the backend. and we will do it like we will grab the user data and keep in a `state` and wrap everything using a provider so that everywhere accessible.
- install jwt-decode package using `npm i jwt-decode`

- proxy.ts

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

/**
 * Small interface describing the shape of the JWT payload we expect.
 * Keep this lightweight — we only rely on id, email and role here.
 */
interface userInterface {
  id: string;
  email: string;
  // Role determines which protected routes the user may access
  role: "ADMIN" | "DOCTOR" | "PATIENT";
  iat: number; // issued-at timestamp
  exp: number; // expiry timestamp
}

/**
 * A minimal role -> allowed routes mapping. If you add routes here,
 * make sure they match the paths used by your Next.js `matcher`.
 *
 * Note: patterns here are simple prefixes used with startsWith in the
 * code below — they are not full glob/regex patterns.
 */
const roleBasedRoutes = {
  ADMIN: ["/admin/dashboard/*"],
  DOCTOR: ["/doctor/dashboard"],
  PATIENT: [
    "/patient/dashboard",
    "/patient/appointments",
    "/patient/medical-records",
  ],
};

// Public authentication routes — users should be allowed to visit these
// even when they don't have a valid access token.
const authRoutes = ["/login", "/register", "/forgot-password"];

/**
 * Middleware-like proxy function used by Next.js routing. It enforces:
 * - Redirect to `/login` when no tokens are present and the route is protected
 * - Decoding of the access token to determine user role
 * - If the access token is missing/expired but a refresh token exists,
 *   it calls the backend refresh endpoint to attempt to obtain a new access token
 * - Role-based route authorization (redirect to `/unauthorized` when not allowed)
 * - Prevent logged-in users from seeing auth pages (redirect to `/`)
 *
 * Inputs:
 * - request: NextRequest provided by Next.js
 *
 * Outputs:
 * - NextResponse.redirect(...) to move the user to login/unauthorized
 * - NextResponse.next() to allow the request through
 *
 * Error modes:
 * - On token decoding or refresh errors the user is redirected to `/login`
 */
export async function proxy(request: NextRequest) {
  // Read tokens from cookies (if present). We only read; we don't set
  // cookies here — the backend refresh endpoint should set them when applicable.
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  const { pathname } = request.nextUrl;

  // If the user is unauthenticated (no tokens) and trying to access a
  // protected route (not in authRoutes) redirect them to login with a
  // `redirect` query so they return after signing in.
  if (!accessToken && !refreshToken && !authRoutes.includes(pathname)) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }

  let user: userInterface | null = null;

  // If we have an access token, try to decode it to extract role and other claims.
  // We catch decode errors (malformed token) and treat them as unauthenticated.
  if (accessToken) {
    try {
      // jwtDecode returns the payload — we trust it conforms to userInterface
      user = jwtDecode(accessToken);
    } catch (error) {
      // Decoding failed (token corrupted or unexpected format): force login.
      console.log("Error Decoding the Access Token", error);
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url)
      );
    }
  }

  // If decoding failed (no user) but we still have a refresh token, attempt
  // to refresh via the backend. The backend is expected to set new cookies
  // (accessToken / refreshToken) on success. If refresh fails, clear cookies
  // and redirect to login.
  if (!user && refreshToken) {
    try {
      const refreshRes = await fetch(
        `${process.env.BACKEND_URL}/auth/refresh-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (refreshRes.ok) {
        // NOTE: The backend should set cookies via Set-Cookie on the response.
        // Since this running in edge/middleware, we attempt to read the cookie
        // again from the incoming request — depending on your setup you may
        // need to proxy the backend response cookies into NextResponse here.
        const newAccessToken = request.cookies.get("accessToken")?.value;
        // Non-null assertion used because we only proceed if refresh succeeded.
        user = jwtDecode(newAccessToken!);
        return NextResponse.next();
      } else {
        // Refresh failed: remove tokens and force login
        const response = NextResponse.redirect(
          new URL(`/login?redirect=${pathname}`, request.url)
        );
        response.cookies.delete("accessToken");
        response.cookies.delete("refreshToken");
        return response;
      }
    } catch (error) {
      // Network or other error while contacting auth service — treat as auth failure
      console.log("Error refreshing token", error);
      const response = NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url)
      );
      response.cookies.delete("accessToken");
      response.cookies.delete("refreshToken");
      return response;
    }
  }

  // If we have a decoded user, enforce role-based routing.
  if (user) {
    // Determine allowed routes for this role. If role is missing/unknown,
    // allowedRoutes will be undefined and user will be treated as unauthorized.
    const allowedRoutes = user ? roleBasedRoutes[user.role] : [];

    // We use startsWith to match prefixes; ensure the entries in
    // `roleBasedRoutes` are compatible with this approach.
    if (allowedRoutes && allowedRoutes.some((r) => pathname.startsWith(r))) {
      // Authorized for this route — continue to requested route.
      return NextResponse.next();
    } else {
      // User is authenticated but not authorized for this route.
      return NextResponse.redirect(new URL(`/unauthorized`, request.url));
    }
  }

  // If a logged-in user attempts to open an auth page (login/register),
  // redirect them to the home page (or dashboard) since they are already signed in.
  if (user && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL(`/`));
  }

  // Default: allow the request through. This covers requests like public
  // pages or cases where token handling above did not trigger a redirect.
  return NextResponse.next();
}

// Matching paths for this proxy/middleware. Adjust as your app grows.
// See Next.js docs for `matcher` patterns when adding more protected routes.
export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register", "/forgot-password"],
};
```

## 67-3 Creating UserProvider and useUser hook, 67-4 Consuming user and refactoring

- src- provider - useProviders.tsx

```ts
"use client";
import { userInterface } from "@/types/userTypes";
import checkAuthStatus from "@/utility/auth";
import { createContext, useContext, useEffect, useState } from "react";

interface UserContextInterface {
  user: userInterface | null;
  setUser: React.Dispatch<React.SetStateAction<userInterface | null>>;
}

const UserContext = createContext<UserContextInterface | undefined>(undefined);

export const UseUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider.");
  }
  return context;
};

export const UserProvider = ({
  initialUser,
  children,
}: {
  initialUser?: userInterface | null;
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<userInterface | null>(initialUser ?? null);

  useEffect(() => {
    const revalidateUser = async () => {
      try {
        const res = await checkAuthStatus();
        setUser(res.user);
      } catch {
        setUser(null);
      }
    };
    if (!user) {
      revalidateUser();
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
```

- login.tsx

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import loginUser from "@/utility/login";
import { useRouter } from "next/navigation";
import checkAuthStatus from "@/utility/auth";
import { UseUser } from "@/providers/userProviders";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setUser } = UseUser();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log(data);
    setIsLoading(true);
    setError(null);

    //Hashed string for "super@admin": $2b$10$Yd4pQGXKFP5opoELqSdE1uBhcXwTc74u3/D7lag8XHGXJ4S5ZQeLS
    try {
      const res = await loginUser(data.email, data.password); //{success: true, message: 'User loggedin successfully!', data: {needPasswordChange: false}}

      if (res.success) {
        const authStatus = await checkAuthStatus();

        setUser(authStatus.user); //setUser Immiditaly.

        if (authStatus.isAuthenticated && authStatus.user) {
          const { role } = authStatus.user;

          switch (role) {
            case "ADMIN":
              router.push("/admin/dashboard");
              break;
            case "DOCTOR":
              router.push("/dashboard/doctor");
              break;
            case "PATIENT":
              router.push("/dashboard/patient");
              break;
            default:
              router.push("/");
              break;
          }
        } else {
          setError("Failed to retrieve user information after login.");
        }
      }
    } catch (err: any) {
      setError(
        err.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-12 px-4">
      <div className="text-center mb-4">
        <Link href="/">
          <span className="text-3xl font-bold text-primary cursor-pointer">
            PH Health Care
          </span>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome Back!</CardTitle>
              <CardDescription>
                Sign in to access your dashboard.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              {error && (
                <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded-md">
                  {error}
                </p>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center justify-center h-full w-10 text-muted-foreground"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-4 mt-2">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="underline">
                  Sign up
                </Link>
              </div>
              <button className="text-center text-sm text-muted-foreground">
                <Link href="/" className="underline">
                  back to home
                </Link>
              </button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
```

- publicNavbar.tsx

```ts
"use client";
import Link from "next/link";

import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { UseUser } from "@/providers/userProviders";

const PublicNavbar = () => {
  const { user } = UseUser();
  const role = user?.role || "guest";

  const navItems = [
    { href: "#", label: "Consultation" },
    { href: "#", label: "Health Plans" },
    { href: "#", label: "Medicine" },
    { href: "#", label: "Diagnostics" },
    { href: "#", label: "NGOs" },
  ];

  if (role === "ADMIN") {
    navItems.push({ href: "/admin/dashboard", label: "Admin Dashboard" });
  }
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur  dark:bg-background/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">PH Doc</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-2">
          {role !== "guest" ? (
            <Button variant="destructive">Logout</Button>
          ) : (
            <Link href="/login" className="text-lg font-medium">
              <Button>Login</Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu */}

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                {" "}
                <Menu />{" "}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-4">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <nav className="flex flex-col space-y-4 mt-8">
                {navItems.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-lg font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t pt-4 flex flex-col space-y-4">
                  <div className="flex justify-center"></div>
                  {role !== "guest" ? (
                    <Button variant="destructive">Logout</Button>
                  ) : (
                    <Link href="/login" className="text-lg font-medium">
                      <Button>Login</Button>
                    </Link>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default PublicNavbar;
```

## 67-5 Refactoring a few things and the logout feature

- api - logout - route.ts

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete("accessToken");
  res.cookies.delete("refreshToken");
  return res;
}
```

- logOut.ts

```ts
export const logOutUser = async () => {
  await fetch("/api/logout", { method: "POST" }), (window.location.href = "/");
};
```

when click the logout server can leave the user from website

- call in publicNavbar

```ts
<div className="border-t pt-4 flex flex-col space-y-4">
  <div className="flex justify-center"></div>
  {role !== "guest" ? (
    <Button
      variant="destructive"
      onClick={() => {
        logOutUser();
      }}
    >
      Logout
    </Button>
  ) : (
    <Link href="/login" className="text-lg font-medium">
      <Button>Login</Button>
    </Link>
  )}
</div>
```
