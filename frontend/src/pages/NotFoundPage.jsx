import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-200 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-neutral-800 mb-2">Page not found</h1>
        <p className="text-neutral-500 mb-6">
          The page you are looking for does not exist.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
