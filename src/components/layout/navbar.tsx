import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

const Navbar = () => {
    return (
        <header className="border-b px-4 py-3 shadow">
            <div className="flex items-center gap-3">
                <SidebarTrigger />

                <Separator
                    className="mr-2 data-[orientation=vertical]:h-6"
                    orientation="vertical"
                />
            </div>
        </header>
    );
};

export default Navbar;
