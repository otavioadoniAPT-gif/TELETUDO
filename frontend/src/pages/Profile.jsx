import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';

function initials(nameOrEmail = '') {
  const base = nameOrEmail.trim();
  if (!base) return '?';
  const parts = base.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const currentName = user?.user_metadata?.full_name || '';
  const [fullName, setFullName] = useState(currentName);
  const [savingName, setSavingName] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  if (!user) {
    return <div className="empty-state">Você precisa estar logado.</div>;
  }

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  async function saveName(e) {
    e.preventDefault();
    if (savingName) return;
    setSavingName(true);
    try {
      await updateProfile({ fullName: fullName.trim() });
      toast.success('Nome atualizado.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (savingPass) return;
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSavingPass(true);
    try {
      await updateProfile({ password });
      toast.success('Senha alterada com sucesso.');
      setPassword('');
      setConfirm('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1>Meu Perfil</h1>
        <p className="page-sub">Gerencie suas informações de conta</p>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar">{initials(currentName || user.email).toUpperCase()}</div>
        <div className="profile-hero-info">
          <h2>{currentName || 'Sem nome'}</h2>
          <p>{user.email}</p>
          <span className="role-badge">GERENTE</span>
        </div>
      </div>

      <div className="profile-grid">
        <section className="panel">
          <div className="section-head">
            <span className="section-num">1</span> Dados da conta
          </div>
          <form onSubmit={saveName} className="profile-form">
            <label>
              <span>Nome</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </label>
            <label>
              <span>E-mail</span>
              <input type="email" value={user.email} disabled />
              <small className="field-hint">O e-mail não pode ser alterado por aqui.</small>
            </label>
            <label>
              <span>Conta criada em</span>
              <input type="text" value={createdAt} disabled />
            </label>
            <button type="submit" className="btn-primary" disabled={savingName}>
              {savingName ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-head">
            <span className="section-num">2</span> Segurança
          </div>
          <form onSubmit={savePassword} className="profile-form">
            <label>
              <span>Nova senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>Confirmar nova senha</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={savingPass}>
              {savingPass ? 'Salvando…' : 'Alterar senha'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
