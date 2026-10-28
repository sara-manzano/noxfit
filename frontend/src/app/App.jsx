import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { LegalPage, legalRoutes } from '../components/LegalPage.jsx';
import { LoginForm } from '../components/LoginForm.jsx';
import { PlanPage } from '../components/PlanPage.jsx';
import { planRoutes } from '../lib/plans.js';

const readStaticPage = () => {
  const hash = window.location.hash.replace('#', '');
  return legalRoutes.includes(hash) || planRoutes.includes(hash) ? hash : null;
};

const AppContent = () => {
  const { session, login, register, logout } = useAuth();
  const [staticPage, setStaticPage] = useState(readStaticPage);

  useEffect(() => {
    const handleHashChange = () => {
      setStaticPage(readStaticPage());
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const closeStaticPage = () => {
    window.history.pushState(null, '', window.location.pathname + window.location.search);
    setStaticPage(null);
  };

  if (planRoutes.includes(staticPage)) {
    return <PlanPage slug={staticPage} onBack={closeStaticPage} />;
  }

  if (staticPage) {
    return <LegalPage page={staticPage} onBack={closeStaticPage} />;
  }

  if (!session) {
    return <LoginForm onSubmit={login} onRegister={register} />;
  }

  return <AppShell session={session} onLogout={logout} />;
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;