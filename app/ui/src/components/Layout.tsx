import { NavLink, Outlet } from "react-router-dom";

export default function Layout() {
    return (
        <div>
            <nav>
                <NavLink to="/producers">Producers</NavLink>
                <NavLink to="/consumers">Consumers</NavLink>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
