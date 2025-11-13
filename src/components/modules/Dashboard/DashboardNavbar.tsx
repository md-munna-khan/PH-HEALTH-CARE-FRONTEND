
import { getUserInfo } from "@/services/auth/getUserInfo";
import DashboardNavbarContent from "./DashboardNavbarContent";



const DashboardNavbar = async () => {
    const userInfo= await getUserInfo();
    return <DashboardNavbarContent userInfo={userInfo} />
};