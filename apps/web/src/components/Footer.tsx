import { useTranslation } from 'react-i18next';

export default function Footer(){
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-white/10">
      <div className="container py-8 text-sm text-white/70">
        {t('footer.copy', { year })}
      </div>
    </footer>
  );
}
