import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Truck, 
  Settings, 
  LogOut, 
  User as UserIcon,
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  currentPage: string;
  setCurrentPage: (page: any) => void;
}

export function Layout({ children, profile, currentPage, setCurrentPage }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['customer', 'admin', 'delivery', 'inventory_manager', 'delivery_manager'] },
    { id: 'subscriptions', label: 'Subscriptions', icon: CalendarDays, roles: ['customer', 'admin'] },
    { id: 'delivery', label: 'Delivery', icon: Truck, roles: ['delivery', 'admin', 'delivery_manager'] },
    { id: 'admin', label: 'Admin Panel', icon: Settings, roles: ['admin', 'inventory_manager', 'delivery_manager'] },
  ];

  const filteredNavItems = navItems.filter(item => profile && item.roles.includes(profile.role));

  const handleLogout = () => auth.signOut();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-stone-200 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">M&S Farms</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                currentPage === item.id 
                  ? "bg-emerald-50 text-emerald-700 font-medium shadow-sm" 
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 truncate">{profile?.name}</p>
              <p className="text-xs text-stone-500 truncate capitalize">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">M</div>
          <h1 className="text-lg font-bold text-stone-900 tracking-tight">M&S Farms</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-stone-600">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-40 pt-20 p-6 flex flex-col">
          <nav className="flex-1 space-y-2">
            {filteredNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-lg",
                  currentPage === item.id 
                    ? "bg-emerald-50 text-emerald-700 font-semibold" 
                    : "text-stone-500"
                )}
              >
                <item.icon size={24} />
                {item.label}
              </button>
            ))}
          </nav>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-6 py-4 text-red-600 font-semibold"
          >
            <LogOut size={24} />
            Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
