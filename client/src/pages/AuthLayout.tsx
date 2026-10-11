import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Logo } from '../components/Logo';
import { NightScene } from '../components/NightScene';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-7 sm:px-12">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <div key={pathname} className="w-full max-w-sm animate-rise">
            {children}
          </div>
        </div>
        <p className="text-xs text-stone-400">A demo booking system for night market vendors.</p>
      </div>

      <div className="relative hidden p-3 lg:block">
        <div className="sticky top-3 h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[1.75rem] bg-stone-950">
          <NightScene theme="lantern" seed={11} width={420} height={560} className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/10 to-black/55" />
          <div className="absolute inset-x-0 bottom-0 p-10 pb-24 xl:p-14 xl:pb-28">
            <h2 className="max-w-lg font-display text-5xl leading-[1.04] tracking-tight text-white xl:text-6xl">
              Your pitch at the market, <em className="text-lantern-200">first come, first served.</em>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
              Browse upcoming night markets, pick your exact stall on a live floor plan, and get confirmed in
              seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
