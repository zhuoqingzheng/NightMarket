import { Navigate, Outlet, Route, Routes, useLocation, type Location } from 'react-router';
import { AppShell } from './components/AppShell';
import { ErrorState, FullPageSpinner } from './components/States';
import { useMe } from './helpers/hooks';
import { AuthLayout } from './pages/AuthLayout';
import { BookingsPage } from './pages/BookingsPage';
import { EventPage } from './pages/EventPage';
import { EventsPage } from './pages/EventsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:slug" element={<EventPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Router state on the sign-in pages: where to go once the merchant has signed in. */
interface RedirectState {
  from: Location;
}

/** Pages for signed-in merchants. Anyone else is sent to sign in, then brought back afterwards. */
function RequireAuth() {
  const { data: merchant, error, isPending, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-6">
        <ErrorState title="Can’t reach Night Market" message={error.message} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (!merchant) return <Navigate to="/login" replace state={{ from: location } satisfies RedirectState} />;
  return <AppShell />;
}

/** Sign-in and sign-up. Once a merchant is signed in, continue to wherever they were heading. */
function GuestOnly() {
  const { data: merchant, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageSpinner />;
  if (merchant) {
    const from = (location.state as RedirectState | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}${from.hash}` : '/'} replace />;
  }
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
