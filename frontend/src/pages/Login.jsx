import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import Logo from '../components/Logo.jsx';

export default function Login() {
  const { signIn, signUp, configured } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        toast.success('Bem-vindo de volta!');
      } else {
        await signUp(email.trim(), password, fullName.trim());
        toast.success('Conta criada! Verifique seu e-mail se a confirmação estiver ativa.');
        setMode('login');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={54} />
          <h1>
            Tele<span className="accent-text">Tudo</span>
          </h1>
          <p className="auth-subtitle">Painel de Envios do Telegram</p>
        </div>

        {!configured && (
          <div className="auth-warning">
            ⚠️ Supabase não configurado. Defina <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env.local</code> e reinicie o
            servidor.
          </div>
        )}

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => setMode('signup')}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              <span>Nome</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
              />
            </label>
          )}

          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="btn-primary auth-submit" disabled={busy || !configured}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
