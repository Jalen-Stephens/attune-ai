import Link from 'next/link';
import { Container } from '@/components/Container';

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/auth/login', label: 'Log in' },
  { href: '/auth/signup', label: 'Sign up' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <Container>
        <div className="py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Link href="/" className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                Attune AI
              </Link>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                Voice- and text-based AI support with specialized agents.
              </p>
            </div>
            <nav className="flex flex-wrap gap-6" aria-label="Footer navigation">
              {footerLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-10 pt-8 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              © {year} Attune AI. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
