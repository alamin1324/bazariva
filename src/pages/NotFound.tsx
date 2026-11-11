import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-royal">404</p>
      <p className="mt-2 text-lg font-semibold text-navy">{t.notFound}</p>
      <Link to="/" className="mt-4 font-semibold text-royal">{t.backHome} →</Link>
    </div>
  );
}
