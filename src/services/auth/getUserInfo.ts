"use server";
import { UserInfo } from "@/types/user.interface";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getCookie } from "./tokenHandler";
import jwt, { JwtPayload } from "jsonwebtoken";

export const getUserInfo = async (): Promise<UserInfo | null> => {
try {
    const accessToken =await getCookie("accessToken");

    if(!accessToken){
        return null
    }
const verifiedToken= jwt.verify(accessToken, process.env.JWT_SECRET as string) as JwtPayload;
if(!verifiedToken){
    return null
}

const userInfo: UserInfo = {
    name: verifiedToken.name || "unknown user" ,
    email: verifiedToken.email ,
    role: verifiedToken.role 
};

return userInfo;
} catch (error:any) {
    console.log(error)
    return null
}
}