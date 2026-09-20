/*
 * ============================================================
 * MA SANTÉ - PAGE DE CONNEXION
 * ============================================================
 *
 * Fichier :
 * src/pages/Login.jsx
 *
 * ============================================================
 */

import { useState } from "react";

import {
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  HeartPulse,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

import "../styles/Login.css";


export default function Login() {

  /* ==========================================================
     AUTHENTIFICATION
     ========================================================== */

  const { login } = useAuth();
  const navigate = useNavigate();


  /* ==========================================================
     ÉTATS
     ========================================================== */

  const [username, setUsername] = useState("admin");

  const [password, setPassword] = useState("Admin@2026!");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);


  /* ==========================================================
     CONNEXION
     ========================================================== */

  async function submit(e) {

    e.preventDefault();

    setError("");

    setLoading(true);

    try {

      await login(username, password);

      /*
       * Après une connexion réussie,
       * l'utilisateur est envoyé vers les modules.
       */
      navigate("/modules");

    } catch (err) {

      setError(
        "Identifiant ou mot de passe incorrect."
      );

    } finally {

      setLoading(false);

    }
  }


  /* ==========================================================
     AFFICHAGE
     ========================================================== */

  return (

    <div className="login-page">


      {/* ======================================================
          IMAGE DE FOND
          ====================================================== */}

      <div className="login-background">

        <div className="login-background-overlay"></div>

      </div>



      {/* ======================================================
          CONTENU PRINCIPAL
          ====================================================== */}

      <div className="login-content">


        {/* ====================================================
            PARTIE GAUCHE
            ==================================================== */}

        <div className="login-left">

          <div className="login-slogan">

            <span>Santé</span>

            <span>Proximité</span>

            <span>Confiance</span>

          </div>

        </div>



        {/* ====================================================
            PARTIE DROITE
            ==================================================== */}

        <div className="login-right">


          {/* ==================================================
              FORMULAIRE
              ================================================== */}

          <form
            className="login-form"
            onSubmit={submit}
          >


            {/* =================================================
                LOGO
                ================================================= */}

            <div className="login-brand">


              <div className="login-brand-icon">

                <HeartPulse
                  size={32}
                  strokeWidth={2.5}
                />

              </div>


              <div className="login-brand-text">

                <div className="login-brand-name">

                  MA <strong>SANTÉ</strong>

                </div>


                <div className="login-brand-subtitle">

                  Gestion de Clinique

                </div>

              </div>

            </div>



            {/* =================================================
                TITRE
                ================================================= */}

            <h1 className="login-title">

              Connectez-vous à votre espace

            </h1>



            {/* =================================================
                ERREUR
                ================================================= */}

            {error && (

              <div className="login-error">

                {error}

              </div>

            )}



            {/* =================================================
                IDENTIFIANT
                ================================================= */}

            <div className="form-group">

              <label htmlFor="username">

                Identifiant

              </label>


              <div className="input-wrapper">


                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  placeholder="Votre identifiant"
                  autoComplete="username"
                  required
                />

              </div>

            </div>



            {/* =================================================
                MOT DE PASSE
                ================================================= */}

            <div className="form-group">

              <label htmlFor="password">

                Mot de passe

              </label>


              <div className="input-wrapper">


                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  required
                />


                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >

                  {showPassword ? (

                    <EyeOff size={17} />

                  ) : (

                    <Eye size={17} />

                  )}

                </button>

              </div>

            </div>



            {/* =================================================
                MOT DE PASSE OUBLIÉ
                ================================================= */}

            <div className="forgot-password-container">

              <button
                type="button"
                className="forgot-password"
              >

                Mot de passe oublié ?

              </button>

            </div>



            {/* =================================================
                BOUTON DE CONNEXION
                ================================================= */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading
                ? "Connexion..."
                : "Se connecter"}

            </button>



            {/* =================================================
                TEXTE FINAL
                ================================================= */}

            <div className="login-bottom-text">

              Une clinique plus organisée,
              plus humaine et plus intelligente

            </div>


          </form>

        </div>

      </div>

    </div>

  );
}