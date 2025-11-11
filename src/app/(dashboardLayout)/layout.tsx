import LogoutButton from "@/components/shared/LogoutButton";

const CommonDashboardLayout = async ({children}:{children:React.ReactNode}) => {
    return (
        <div>
     <LogoutButton/>
            {children}

        </div>
    );
};

export default CommonDashboardLayout