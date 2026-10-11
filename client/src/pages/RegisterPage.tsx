import type { RegisterRequest } from '@night-market/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { FormError, InputField } from '../components/ui/Field';
import { api } from '../lib/api';
import { firstName } from '../lib/format';
import { useDocumentTitle } from '../lib/hooks';

const EMPTY: RegisterRequest = { contactName: '', businessName: '', cuisine: '', email: '', password: '' };

export function RegisterPage() {
  useDocumentTitle('Create an account');
  const queryClient = useQueryClient();
  const location = useLocation();
  const [form, setForm] = useState<RegisterRequest>(EMPTY);

  const register = useMutation({
    mutationFn: api.register,
    onSuccess: (merchant) => {
      toast.success(`Welcome to Night Market, ${firstName(merchant.contactName)}`);
      queryClient.setQueryData(['me'], merchant);
    },
  });

  const field = (name: keyof RegisterRequest) => ({
    name,
    value: form[name],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [name]: event.target.value })),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    register.mutate(form);
  }

  return (
    <>
      <h1 className="font-display text-[2.75rem] leading-none tracking-tight text-stone-900">Join the market</h1>
      <p className="mt-3 text-balance text-[15px] leading-relaxed text-stone-500">
        Create a vendor account to start booking stalls. It takes less than a minute.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {register.error && <FormError>{register.error.message}</FormError>}
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Your name" autoComplete="name" required maxLength={80} {...field('contactName')} />
          <InputField
            label="Business name"
            autoComplete="organization"
            required
            maxLength={80}
            {...field('businessName')}
          />
        </div>
        <InputField
          label="What you serve"
          hint="Optional"
          placeholder="e.g. Dumplings, tacos, gelato"
          maxLength={60}
          {...field('cuisine')}
        />
        <InputField label="Email" type="email" autoComplete="email" required {...field('email')} />
        <InputField
          label="Password"
          hint="At least 8 characters"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          {...field('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-10 text-sm text-stone-500">
        Already have an account?{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 transition-colors hover:decoration-stone-900"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
