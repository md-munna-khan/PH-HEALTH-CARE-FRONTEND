/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";


import z from "zod";
import{parse} from "cookie";
import { cookies } from "next/headers";

const loginValidationZodSchema = z.object({
  email: z.email({
    error:"Invalid email address",
  }),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const loginUser = async (
  _currentState: any,
  formData: any
): Promise<any> => {
  try {
     let accessTokenObject:null| any = null
     let refreshTokenObject:null| any = null
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };
const validatedFields= loginValidationZodSchema.safeParse(loginData);
if(!validatedFields.success){
  return {error: validatedFields.error.issues.map(issue=>{
    return{
      field: issue.path[0],
      message: issue.message,
    }
  })}
}
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
       body: JSON.stringify(loginData),
      headers: {
        "Content-Type": "application/json",
      },
    })
   const result = await res.json();
const setCookieHeaders = res.headers.getSetCookie();
console.log(setCookieHeaders,"setCookie")

if(setCookieHeaders && setCookieHeaders.length > 0){
  setCookieHeaders.forEach((cookie: string) => {
console.log(cookie,"for each cookie")
const parsedCookie = parse(cookie);
console.log(parsedCookie)
if (parsedCookie['accessToken']) {
  accessTokenObject = parsedCookie['accessToken'];
}
if (parsedCookie['refreshToken']) {
  refreshTokenObject = parsedCookie['refreshToken'];
}

  })
}else{
  throw new Error("No Set-Cookie header found");
}

if(!accessTokenObject ){
  throw new Error("Tokens not found in cookies");
}
if(!refreshTokenObject){
  throw new Error("Tokens not found in cookies");
}

const cookieStore = await cookies();
cookieStore.set("accessToken", accessTokenObject.accessToken,{
httpOnly: true,
maxAge: parseInt(accessTokenObject["Max-Age"]|| 1000 *  60 * 60),
path: accessTokenObject.path || "/",
secure: true,
sameSite:accessTokenObject["samesite"] || "none",
})
cookieStore.set("refreshToken", refreshTokenObject.refreshToken,{
httpOnly: true,
maxAge: parseInt(accessTokenObject["Max-Age"]|| 1000 *  60 * 60 * 24 * 90),
path: accessTokenObject.path || "/",
secure: true,
sameSite:accessTokenObject["samesite"] || "none",
})

    return result;
  } catch (error) {
    console.log(error);
    return { error: "login failed" };
  }
};
