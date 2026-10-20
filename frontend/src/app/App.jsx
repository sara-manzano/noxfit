import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { AppShell } from '../components/AppShell.jsx';
import { LoginForm } from '../components/LoginForm.jsx';

const AppContent = () => {
  const { session, login, register, logout } = useAuth();

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