import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-dark-800 text-gray-300">
      <div className="container mx-auto py-6 px-4 text-center">
        <p>&copy; {new Date().getFullYear()} Osus</p>
        <p className="mt-2 text-sm">{t('footer.disclaimer')}</p>
      </div>
    </footer>
  );
};

export default Footer;