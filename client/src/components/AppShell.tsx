import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { cn } from '../helpers/cn';
import { useMerchant, useSignOut } from '../helpers/hooks';
import { Avatar } from './Avatar';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Events', end: true },
  { to: '/bookings', label: 'My bookings', end: false },
];

export function AppShell() {
  const merchant = useMerchant();
  const signOut = useSignOut();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-900/[0.06] bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:gap-8 sm:px-8">
          <Link
            to="/"
            className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lantern-500"
          >
            <Logo compact />
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-stone-900/[0.06] text-stone-900' : 'text-stone-500 hover:text-stone-900',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <div className="text-[13px] font-medium text-stone-900">{merchant.businessName}</div>
              <div className="text-xs text-stone-500">{merchant.contactName}</div>
            </div>
            <Avatar name={merchant.contactName} />
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-900/5 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-lantern-500"
            >
              <LogOut className="size-4" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Outlet />
      </main>

      <footer className="border-t border-stone-900/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 text-xs text-stone-400 sm:flex-row sm:justify-between sm:px-8">
          <span>Night Market · Stall bookings for food vendors</span>
          <span>Stalls are allocated first come, first served.</span>
        </div>
      </footer>
    </div>
  );
}
