/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import z from "zod";

                
const registerValidationZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters long"),
    address: z.string().min(5, "Address must be at least 5 characters long"),       
    email: z.email({
        error:"Invalid email address",
    }), 
    password: z.string().min(6, "Password must be at least 6 characters long"),
confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters long"),
}).refine((data) => data.password === data.confirmPassword, {
   error:"password do not match",
   path: ["confirmPassword"],
});


export const registerPatient = async (_currentState:any,formData:any):Promise<any> => {
try {

    const registerDataToValidate={
        name:formData.get("name"),
        address:formData.get("address"),
        email:formData.get("email"),
        password:formData.get("password"),
        confirmPassword:formData.get("confirmPassword"),
    }    
const validatedFields= registerValidationZodSchema.safeParse(registerDataToValidate);

if(!validatedFields.success){
  return {error: validatedFields.error.issues.map(issue=>{
    return{
      field: issue.path[0],
      message: issue.message,
    }
  })}
}


    const registerData={
        password:formData.get("password") ,
        patient:{
            name:formData.get("name"),
            address:formData.get("address"),
            email:formData.get("email"),
        }
    }

    const newFormData = new FormData();
    newFormData.append("data", JSON.stringify(registerData));
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/create-patient`, {
        method: "POST",
        body: newFormData,
    }).then(res => res.json());
console.log(res)
    return res

} catch (error) {
    console.log(error)
    return {error:"registration failed"}
}
}