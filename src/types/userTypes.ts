 
 export interface userInterface {
    id: string;
    email: string;
    // Role determines which protected routes the user may access
    role: "ADMIN" | "DOCTOR" | "PATIENT";
    iat: number; // issued-at timestamp
    exp: number; // expiry timestamp
}