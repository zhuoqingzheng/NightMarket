import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui/Button';
import { FormError, InputField } from '../components/ui/Field';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../helpers/api';
import { firstName } from '../helpers/format';
import { useDocumentTitle } from '../helpers/hooks';

const DEMO_PASSWORD = 'demo1234';

const DEMO_ACCOUNTS = [
  { name: 'Alex Chen', business: 'Golden Dumpling Co.', email: 'demo@nightmarket.app' },
  { name: 'Sam Rivera', business: 'Smoke & Fire Tacos', email: 'sam@nightmarket.app' },
];

export function LoginPage() {
  useDocumentTitle('Sign in');
  const queryClient = useQueryClient();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Which button started the sign-in: the form, or one of the demo accounts (by email).
  const [source, setSource] = useState('form');

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (merchant) => {
      toast.success(`Welcome back, ${firstName(merchant.contactName)}`);
      // <GuestOnly> notices the signed-in merchant and sends them on to where they were heading.
      queryClient.setQueryData(['me'], merchant);
    },
  });

  const pendingSource = login.isPending ? source : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSource('form');
    login.mutate({ email, password });
  }

  function signInAsDemo(demoEmail: string) {
    setSource(demoEmail);
    login.mutate({ email: demoEmail, password: DEMO_PASSWORD });
  }

  return (
    <>
      <h1 className="font-display text-[2.75rem] leading-none tracking-tight text-stone-900">Welcome back</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
        Sign in to book your stall at upcoming night markets.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {login.error && <FormError>{login.error.message}</FormError>}
        <InputField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@business.com"
        />
        <InputField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={pendingSource === 'form'}
          disabled={login.isPending}
        >
          Sign in
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />
        or try a demo account
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <div className="grid gap-2.5">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            disabled={login.isPending}
            onClick={() => signInAsDemo(account.email)}
            className="group flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-xs ring-1 ring-inset ring-stone-200 transition hover:shadow-soft hover:ring-stone-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lantern-500 disabled:cursor-wait"
          >
            <Avatar name={account.name} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-stone-900">{account.name}</span>
              <span className="block truncate text-xs text-stone-500">{account.business}</span>
            </span>
            {pendingSource === account.email ? (
              <Spinner className="size-4 text-stone-400" />
            ) : (
              <ArrowRight className="size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-900" />
            )}
          </button>
        ))}
      </div>
      <p className="mt-4 text-pretty text-xs leading-relaxed text-stone-400">
        Tip: sign in as Sam in a private window to see bookings appear live.
      </p>

      <p className="mt-10 text-sm text-stone-500">
        New to Night Market?{' '}
        <Link
          to="/register"
          state={location.state}
          className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
