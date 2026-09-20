import { useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin@masante.local");
  const [password, setPassword] = useState("Admin@2026!");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/modules");
    } catch {
      setError("Identifiant ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="visual-overlay">
          <div className="brand-large"><Logo size={44} inverted/> <span>MA <b>SANTÉ</b></span></div>
          <h1>Une clinique plus organisée,<br/>plus humaine et plus intelligente</h1>
          <p>Une solution centralisée pour gérer les patients, les consultations, les soins, les finances et les ressources de la clinique.</p>
          <div className="login-points">
            <span><ShieldCheck size={18}/> Données protégées</span>
            <span><ShieldCheck size={18}/> Gestion par rôles</span>
            <span><ShieldCheck size={18}/> Interface responsive</span>
          </div>
        </div>
      </div>

      <div className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <div className="login-logo"><Logo size={40}/></div>
          <h2>Bienvenue</h2>
          <p className="muted">Connectez-vous à votre espace MA SANTÉ</p>

          {error && <div className="alert error">{error}</div>}

          <label>Identifiant / adresse e-mail</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Votre identifiant" autoComplete="username"/>

          <label>Mot de passe</label>
          <div className="password-field">
            <input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Votre mot de passe" autoComplete="current-password"/>
            <button type="button" onClick={() => setShow(v => !v)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div>

          <div className="login-options">
            <label className="check"><input type="checkbox"/> Se souvenir de moi</label>
            <button type="button" className="link-button">Mot de passe oublié ?</button>
          </div>

          <button className="primary-button full" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
          <p className="login-footer">Santé – Proximité – Confiance</p>
        </form>
      </div>
    </div>
  );
}
