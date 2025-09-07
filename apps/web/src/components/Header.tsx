import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t, i18n } = useTranslation();
  return (
    <header className="border-b border-white/10 sticky top-0 backdrop-blur bg-slate-bg/80 z-50">
      <div className="container flex items-center justify-between py-4">
        <NavLink to="/" className="text-2xl font-extrabold tracking-tight" style={{color:'#f5b800'}}>BUILDCO</NavLink>
        <nav className="flex items-center gap-6 text-sm">
          <NavLink to="/" className={({isActive})=> isActive? 'text-white' : 'text-white/80 hover:text-white'}>{t('nav.home')}</NavLink>
          <NavLink to="/services" className={({isActive})=> isActive? 'text-white' : 'text-white/80 hover:text-white'}>{t('nav.services')}</NavLink>
          <NavLink to="/references" className={({isActive})=> isActive? 'text-white' : 'text-white/80 hover:text-white'}>{t('nav.references')}</NavLink>
          <NavLink to="/request-quote" className={({isActive})=> isActive? 'text-white' : 'text-white/80 hover:text-white'}>{t('nav.rfq')}</NavLink>
          <NavLink to="/privacy" className={({isActive})=> isActive? 'text-white' : 'text-white/80 hover:text-white'}>{t('nav.privacy')}</NavLink>
          <button className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20" onClick={()=> i18n.changeLanguage(i18n.language === 'hu' ? 'en' : 'hu')}>
            {i18n.language === 'hu' ? 'EN' : 'HU'}
          </button>
        </nav>
      </div>
    </header>
  );
}
