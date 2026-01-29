'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/AppShell';

const PUBLIC_PATHS = ['/', '/about', '/privacy', '/auth/login', '/auth/signup', '/auth/update-password'];

export function LayoutSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname && PUBLIC_PATHS.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
