import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgImage from '@/assets/industrial-bg.png';

const Home: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      {/* Hero section with industrial background */}
      <section
        className="relative h-96 flex items-center justify-center text-center text-white"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            {t('home.heroTitle')}
          </h1>
          <p className="text-lg md:text-2xl mb-6">
            {t('home.heroSubtitle')}
          </p>
          <Link
            to="/request-quote"
            className="inline-block bg-primary text-dark-900 font-semibold px-6 py-3 rounded-md hover:bg-yellow-600"
          >
            {t('home.cta')}
          </Link>
        </div>
      </section>

      {/* Feature section */}
      <section className="py-12 bg-white dark:bg-dark-900 text-gray-800 dark:text-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">
            {t('home.featuresTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-dark-800 text-white rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">
                {t('home.feature1Title')}
              </h3>
              <p>{t('home.feature1Desc')}</p>
            </div>
            <div className="p-6 bg-dark-800 text-white rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">
                {t('home.feature2Title')}
              </h3>
              <p>{t('home.feature2Desc')}</p>
            </div>
            <div className="p-6 bg-dark-800 text-white rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">
                {t('home.feature3Title')}
              </h3>
              <p>{t('home.feature3Desc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;