"use client";

import { userInfo } from "@/types/user.interface";

interface DashboardNavbarContentProps {
    userInfo: userInfo| null;
}
const DashboardNavbarContent = ({userInfo}:DashboardNavbarContentProps) => {
    return (
        <div>
            DashboardNavbarContent
        </div>
    );
};

export default DashboardNavbarContent;