import { Link } from 'react-router-dom';

/**
 * LoginPage
 * Placeholder – authentication will be implemented by Member 2.
 */
function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="card">
          {/* Logo / brand */}
          <div className="text-center mb-8">
            <span className="text-primary-600 font-bold text-2xl">SubsManager</span>
            <p className="mt-1 text-sm text-neutral-500">Subscription Management System</p>
          </div>

          {/* Placeholder notice */}
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
              🚧 Placeholder
            </p>
            <p className="text-sm text-amber-600">
              Authentication will be implemented by <strong>Member 2</strong> on the{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">feature/subscriptions-auth</code>{' '}
              branch.
            </p>
          </div>

          {/* Stub form */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                disabled
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-neutral-100
                           text-neutral-400 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                disabled
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-neutral-100
                           text-neutral-400 text-sm cursor-not-allowed"
              />
            </div>
            <button type="submit" disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Go to{' '}
            <Link to="/dashboard" className="text-primary-600 hover:underline">
              Dashboard (dev shortcut)
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          MakeAton Hackathon · v0.1.0
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
