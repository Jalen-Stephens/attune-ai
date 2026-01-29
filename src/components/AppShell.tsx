'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import {
  LayoutDashboard,
  MessageSquare,
  Menu,
  X,
  UserCheck,
  ChevronDown,
  User,
  CreditCard,
  Settings,
  LogOut,
  Bot,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Agents', href: '/agents', icon: Bot },
  { title: 'Conversations', href: '/dashboard/sessions', icon: MessageSquare },
  { title: 'Referrals', href: '/referrals', icon: UserCheck },
];

function useUserAndProfile() {
  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = React.useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      if (u) {
        supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', u.id)
          .single()
          .then(({ data }) => setProfile(data ?? null));
      } else {
        setProfile(null);
      }
    });
  }, []);

  return { user, profile };
}

const userMenuItems = [
  { title: 'Profile', href: '/dashboard/settings/profile', icon: User },
  { title: 'Account', href: '/dashboard/settings/account', icon: CreditCard },
  { title: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useUserAndProfile();

  const displayName =
    (profile?.display_name?.trim()) ||
    (user?.email?.split('@')[0]) ||
    'User';
  const avatarUrl = profile?.avatar_url?.trim() || null;

  React.useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 border-r bg-card transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-lg font-semibold">Attune AI</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="relative" ref={userMenuRef}>
            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2 h-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setUserMenuOpen((o) => !o)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-label="User menu"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover border border-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium"
                  aria-hidden
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-sm text-muted-foreground max-w-[140px] truncate">
                Welcome, <span className="font-medium text-foreground">{displayName}</span>
              </span>
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', userMenuOpen && 'rotate-180')}
              />
            </Button>
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-card py-1 shadow-lg z-50"
                role="menu"
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user?.email ?? displayName}</p>
                </div>
                <div className="py-1">
                  {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {item.title}
                      </Link>
                    );
                  })}
                </div>
                <Separator className="my-1" />
                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="container mx-auto max-w-5xl px-4 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
