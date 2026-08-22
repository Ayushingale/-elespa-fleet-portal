import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#151821]">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
