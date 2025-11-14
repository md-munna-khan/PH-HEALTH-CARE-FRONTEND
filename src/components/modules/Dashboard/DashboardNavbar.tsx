
import { getUserInfo } from "@/services/auth/getUserInfo";
import DashboardNavbarContent from "./DashboardNavbarContent";
import { userInfo } from "@/types/user.interface";



const DashboardNavbar = async () => {
    const userInfo= await getUserInfo() as userInfo;
    return <DashboardNavbarContent userInfo={userInfo} />
};
export default DashboardNavbar;