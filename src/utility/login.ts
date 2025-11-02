/* eslint-disable @typescript-eslint/no-explicit-any */
const loginUser= async(email:string,password:string)=>{
try {
        const response=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`,{
        method:'POST',
        headers:{   
            'Content-Type':'application/json'
        },
        body:JSON.stringify({email,password}),
        credentials:'include'
    });
    const data=await response.json();  
    return data 
} catch (err:any) {
    throw new Error (err.message);
}
   
}
export default loginUser;