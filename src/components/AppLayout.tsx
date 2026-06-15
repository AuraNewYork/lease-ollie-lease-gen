import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FileText, LogOut } from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 hover:text-slate-700">
            <FileText className="w-5 h-5" />
            <span className="font-semibold text-sm">Lease Ollie</span>
            <span className="text-xs text-slate-400 ml-1 hidden sm:inline">Generator</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:inline">{user?.full_name}</span>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
