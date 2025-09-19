import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const changeLang = () => {
    const next = i18n.language === 'hu' ? 'en' : 'hu';
    i18n.changeLanguage(next);
  };

  return (
    <header className="bg-dark-800 text-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold">
          Site4Fun
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
          className={`flex-1 md:flex md:items-center md:justify-end ${
            open ? 'block' : 'hidden'
          }`}
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block md:inline-block px-3 py-2 ${
                isActive ? 'text-primary' : 'hover:text-primary'
              }`
            }
            onClick={() => setOpen(false)}
          >
            {t('nav.home')}
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `block md:inline-block px-3 py-2 ${
                isActive ? 'text-primary' : 'hover:text-primary'
              }`
            }
            onClick={() => setOpen(false)}
          >
            {t('nav.services')}
          </NavLink>
          <NavLink
            to="/references"
            className={({ isActive }) =>
              `block md:inline-block px-3 py-2 ${
                isActive ? 'text-primary' : 'hover:text-primary'
              }`
            }
            onClick={() => setOpen(false)}
          >
            {t('nav.references')}
          </NavLink>
          <NavLink
            to="/request-quote"
            className={({ isActive }) =>
              `block md:inline-block px-3 py-2 ${
                isActive ? 'text-primary' : 'hover:text-primary'
              }`
            }
            onClick={() => setOpen(false)}
          >
            {t('nav.request')}
          </NavLink>
          <button
            className="block md:inline-block px-3 py-2 hover:text-primary"
            onClick={changeLang}
          >
            {i18n.language.toUpperCase()}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;