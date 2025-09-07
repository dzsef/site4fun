import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Home(){
  const { t } = useTranslation();
  return (
    <section className="container py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight">{t('hero.title')}</h1>
          <p className="mt-4 text-white/80 text-lg">{t('hero.subtitle')}</p>
          <Link to="/request-quote" className="btn-primary inline-block mt-8">{t('hero.cta')}</Link>
        </div>
        <div className="card">
          <div className="aspect-video bg-gradient-to-br from-[#f5b800]/20 to-white/5 rounded-xl" />
          <p className="mt-4 text-white/70">Ipari, modern esztétika: acél, beton, precizitás.</p>
        </div>
      </div>
    </section>
  );
}
