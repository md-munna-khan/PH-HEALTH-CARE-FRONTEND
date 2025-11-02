

/* eslint-disable @typescript-eslint/no-explicit-any */
 const checkAuthStatus=async()=>{
    try {
        const response=await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`,{
            method:'GET',
            headers:{
                'Content-Type':'application/json'
            },
            credentials:'include'
        });
        const data=await response.json();
     
      if(!response.ok){
        throw new Error (data.message ||'Failed to fetch user data');
      }
      return{
        isAuthenticated:true,
        user:data.data
      }
      
     } catch (err:any) {
     console.log(err)
     return{    
        isAuthenticated:false,
        user:null   

    }
}}

export default checkAuthStatus;