import OnboardingTemplate from '../../../components/templates/back/back';
import { IonLabel, useIonRouter } from '@ionic/react';
import { useState, useEffect } from 'react';
import Button from '../../../components/button/button';
import { useAuth } from '../../../contexts/useAuthContext';

const Signin = () => {
  const router = useIonRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { login, loading, error: authError } = useAuth();

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <OnboardingTemplate titleOne="Sign In">
      <div className="relative">
        <div className="blob fixed top-24 translate-y-24 -left-5"></div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <IonLabel htmlFor="email">Email</IonLabel>
            <input
              id="email"
              value={email}
              onChange={({ target }) => setEmail(target.value)}
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              aria-invalid={!!error}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <IonLabel htmlFor="password">Password</IonLabel>
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-secondary font-semibold text-sm hover:text-emerald-500 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="password"
              value={password}
              onChange={({ target }) => setPassword(target.value)}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              aria-invalid={!!error}
            />
          </div>

          <Button
            loading={loading}
            loadingText="Signing In"
            className="!w-full !mx-auto mt-4"
            disabled={loading}
            onClick={handleSubmit}

          text='Sign In'  
          />

          <p className="w-fit mx-auto text-sm mt-2">
            Don't have an account?
            <button
              type="button"
              onClick={() => router.push('/auth/signup')}
              className="ml-1 text-emerald-400 font-semibold hover:text-emerald-500 transition-colors"
              disabled={loading}
            >
              Sign Up
            </button>
          </p>
        </form>

        <div className="ring-blob fixed bottom-24 -translate-y-16 -right-12"></div>
      </div>
    </OnboardingTemplate>
  );
};

export default Signin;