import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const VerifyEmail: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('verifyEmail.errors.missingToken'));
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const confirm = async () => {
      setStatus('loading');
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
        const res = await fetch(`${baseUrl}/auth/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.detail || t('verifyEmail.errors.generic'));
        }

        const user = await res.json().catch(() => null);
        if (!cancelled) {
          setRole(user?.role ?? null);
          setStatus('success');
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setErrorMessage((err as Error).message || t('verifyEmail.errors.generic'));
        setStatus('error');
      }
    };

    confirm();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, t]);

  const roleLabel = role ? t(`register.${role}`, { defaultValue: role }) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#04070F] px-4 py-12 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A0F1B]/95 p-10 text-center shadow-[0_40px_120px_rgba(3,7,18,0.85)]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
            {t('verifyEmail.title')}
          </p>
          {status === 'loading' && (
            <div className="space-y-4">
              <p className="text-lg text-white/80">{t('verifyEmail.loading')}</p>
              <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full animate-pulse bg-primary" />
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-white">
                {t('verifyEmail.successHeading')}
              </h1>
              <p className="text-base text-white/75">
                {roleLabel ? t('verifyEmail.successWithRole', { role: roleLabel }) : t('verifyEmail.success')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-dark-900 transition hover:bg-white"
              >
                {t('verifyEmail.goToLogin')}
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-white">
                {t('verifyEmail.errorHeading')}
              </h1>
              <p className="text-base text-rose-200">{errorMessage}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 via-primary to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-dark-900 transition hover:brightness-110"
                >
                  {t('verifyEmail.retryRegistration')}
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/80 transition hover:text-white"
                >
                  {t('verifyEmail.backToHome')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
