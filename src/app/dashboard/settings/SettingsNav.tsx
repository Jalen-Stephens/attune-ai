'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, CreditCard, Shield } from 'lucide-react';

const navItems = [
  { title: 'Profile', href: '/dashboard/settings/profile', icon: User },
  { title: 'Account', href: '/dashboard/settings/account', icon: CreditCard },
  { title: 'Security', href: '/dashboard/settings/security', icon: Shield },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden lg:block w-56 shrink-0"
        aria-label="Settings"
      >
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile: top tab-style links */}
      <nav className="lg:hidden w-full" aria-label="Settings">
        <ul className="inline-flex w-full rounded-lg bg-muted p-1 text-muted-foreground">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="flex-1 min-w-0">
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
