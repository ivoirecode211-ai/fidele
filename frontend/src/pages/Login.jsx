/*
 * ============================================================
 * MA SANTÉ - PAGE DE CONNEXION
 * ============================================================
 *
 * Deux panneaux sur ordinateur : à gauche l'accueil de la
 * clinique (photo teintée au vert de la charte, marque et
 * devise), à droite le formulaire, à taille de lecture.
 * Sur téléphone, la photo devient un bandeau au-dessus du
 * formulaire.
 *
 * Aucun identifiant n'est pré-rempli : la page est publique.
 * ============================================================
 */

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Chargement from "../components/Chargement";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [aideOuverte, setAideOuverte] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      /*
       * Après une connexion réussie, l'utilisateur est envoyé vers
       * les modules, ou vers la page qu'il voulait ouvrir (la fiche
       * d'un appareil scanné, par exemple). Seules les adresses
       * internes sont suivies.
       */
      const next = params.get("next");
      navigate(next && next.startsWith("/") && !next.startsWith("//") ? next : "/modules");
    } catch {
      setError("Identifiant ou mot de passe incorrect. Vérifiez la saisie, puis réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* ── Accueil de la clinique ── */}
      <aside className="login-visuel" aria-label="MA SANTÉ">
        <div className="login-marque">
          <Logo size={44} inverted />
          <div>
            <strong>MA SANTÉ</strong>
            <span>Gestion de clinique</span>
          </div>
        </div>

        <div className="login-devise">
          <p className="login-devise-mots">
            <span>Santé</span>
            <span>Proximité</span>
            <span>Confiance</span>
          </p>
          <p className="login-devise-phrase">Une clinique plus organisée, plus humaine et plus intelligente.</p>
        </div>
      </aside>

      {/* ── Formulaire ── */}
      <main className="login-panneau">
        <form className="login-form" onSubmit={submit}>
          <div className="login-marque-mobile">
            <Logo size={36} />
            <strong>MA SANTÉ</strong>
          </div>

          <header className="login-tete">
            <h1>Connectez-vous à votre espace</h1>
          </header>

          {error && (
            <p className="login-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="login-champ">
            <label htmlFor="username">Identifiant</label>
            <div className="login-saisie">
              <UserRound size={19} aria-hidden="true" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Identifiant ou e-mail"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-champ">
            <div className="login-champ-ligne">
              <label htmlFor="password">Mot de passe</label>
              <button
                type="button"
                className="login-lien"
                aria-expanded={aideOuverte}
                aria-controls="aide-mot-de-passe"
                onClick={() => setAideOuverte((v) => !v)}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="login-saisie">
              <LockKeyhole size={19} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-oeil"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
            {aideOuverte && (
              <p className="login-aide" id="aide-mot-de-passe">
                Demandez à l'administrateur de votre établissement de vous attribuer un nouveau mot de passe
                (Administration → Utilisateurs).
              </p>
            )}
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading
              ? <><Chargement taille="petite" centre={false} couleur="currentColor" muet />Connexion…</>
              : <><LogIn size={19} aria-hidden="true" />Se connecter</>}
          </button>
        </form>
      </main>
    </div>
  );
}
