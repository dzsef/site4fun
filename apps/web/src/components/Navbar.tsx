import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const updateAuthState = () => {
      setIsAuthenticated(Boolean(localStorage.getItem('token')));
    };
    updateAuthState();
    window.addEventListener('auth-changed', updateAuthState);
    window.addEventListener('storage', updateAuthState);
    return () => {
      window.removeEventListener('auth-changed', updateAuthState);
      window.removeEventListener('storage', updateAuthState);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-changed'));
    setOpen(false);
  };

  return (
    <header className="bg-dark-800 text-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold">
          Osus
        </Link>
        <div className="md:hidden">
          <button
            aria-label="Menü"
            onClick={() => setOpen(!open)}
            className="focus:outline-none"
          >
            ☰
          </button>
        </div>
        <nav
          className={`flex-1 space-y-2 md:space-y-0 md:flex md:items-center md:justify-end md:gap-6 ${
            open ? 'block' : 'hidden'
          }`}
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block md:inline-block px-3 py-2 font-medium transition-colors ${
                isActive ? 'text-primary' : 'hover:text-primary'
              }`
            }
            onClick={() => setOpen(false)}
          >
            {t('nav.home')}
          </NavLink>
          {isAuthenticated ? (
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="md:hidden inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.03] hover:shadow-lg focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-900/20 text-dark-900">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                  <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6v1H4v-1Z" />
                </svg>
              </span>
              {t('nav.profile')}
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="md:hidden inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.03] hover:shadow-lg focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-900/20 text-dark-900">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3.75 5.25A2.25 2.25 0 0 1 6 3h7.5a2.25 2.25 0 0 1 2.25 2.25V9a.75.75 0 0 1-1.5 0V5.25c0-.414-.336-.75-.75-.75H6c-.414 0-.75.336-.75.75v9c0 .414.336.75.75.75h7.5c.414 0 .75-.336.75-.75V10a.75.75 0 0 1 1.5 0v4.25A2.25 2.25 0 0 1 13.5 16.5H6A2.25 2.25 0 0 1 3.75 14.25v-9Z" />
                  <path d="M21 12a.75.75 0 0 0-1.28-.53l-1.72 1.72V8a.75.75 0 0 0-1.5 0v5.19l-1.72-1.72a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25c.146-.147.22-.339.22-.53Z" />
                </svg>
              </span>
              {t('nav.login')}
            </Link>
          )}
          {isAuthenticated && (
            <button
              className="block w-full rounded-md border border-dark-700 px-3 py-2 text-left hover:border-red-500 transition-colors md:hidden"
              onClick={handleLogout}
            >
              {t('nav.logout')}
            </button>
          )}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.03] hover:shadow-lg focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-900/20 text-dark-900">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6v1H4v-1Z" />
                  </svg>
                </span>
                {t('nav.profile')}
              </Link>
              <button
                className="px-3 py-2 text-sm font-medium text-gray-300 hover:text-primary transition-colors"
                onClick={handleLogout}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.03] hover:shadow-lg focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
            >
              <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-900/20 text-dark-900">
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3.75 5.25A2.25 2.25 0 0 1 6 3h7.5a2.25 2.25 0 0 1 2.25 2.25V9a.75.75 0 0 1-1.5 0V5.25c0-.414-.336-.75-.75-.75H6c-.414 0-.75.336-.75.75v9c0 .414.336.75.75.75h7.5c.414 0 .75-.336.75-.75V10a.75.75 0 0 1 1.5 0v4.25A2.25 2.25 0 0 1 13.5 16.5H6A2.25 2.25 0 0 1 3.75 14.25v-9Z" />
                  <path d="M21 12a.75.75 0 0 0-1.28-.53l-1.72 1.72V8a.75.75 0 0 0-1.5 0v5.19l-1.72-1.72a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25c.146-.147.22-.339.22-.53Z" />
                </svg>
              </span>
                {t('nav.login')}
              </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
