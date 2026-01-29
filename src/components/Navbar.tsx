'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/Container';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/about', label: 'About' },
  { href: '/voice', label: 'Voice' },
  { href: '/privacy', label: 'Privacy' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors"
          >
            Attune AI
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  pathname === href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </Link>
            ))}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button size="sm" className="rounded-lg shadow-sm" asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </nav>
      </Container>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <Container className="py-4 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block py-3 text-sm font-medium transition-colors',
                  pathname === href ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
              <Button variant="outline" className="w-full justify-center" asChild>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button className="w-full justify-center rounded-lg shadow-sm" asChild>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                  Sign up
                </Link>
              </Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
