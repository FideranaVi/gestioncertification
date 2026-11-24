"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./connexion.module.css";

const API = "http://localhost:5000/api/auth";

export default function ConnexionPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficherPwd, setAfficherPwd] = useState(false);

  const handleConnexion = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const response = await fetch(`${API}/connexion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          pwd,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Email ou mot de passe incorrect.");
      }

      if (!data.token || !data.utilisateur) {
        throw new Error("Les informations de connexion reçues sont invalides.");
      }

      const utilisateur = data.utilisateur;
      const role = String(utilisateur.role || "").toLowerCase().trim();

      let destination = "";

      if (role === "administrateur" || role === "admin") {
        destination = "/dashboard/admin";
      } else if (role === "formateur") {
        destination = "/dashboard/formateur";
      } else if (role === "apprenant") {
        destination = "/dashboard/apprenant";
      } else {
        throw new Error("Rôle utilisateur non reconnu.");
      }

      const utilisateurStocke = {
        ...utilisateur,
        role,
      };

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(utilisateurStocke));

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(utilisateurStocke));

      router.replace(destination);
    } catch (error) {
      setErreur(error.message || "Une erreur est survenue.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Connexion</h1>
        <p>Connectez-vous à votre compte Learning Pro.</p>

        {erreur && (
          <div className={styles.error}>
            {erreur}
          </div>
        )}

        <form onSubmit={handleConnexion}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse email"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pwd">Mot de passe</label>

            <div className={styles.passwordContainer}>
              <input
                id="pwd"
                type={afficherPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Votre mot de passe"
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setAfficherPwd(!afficherPwd)}
              >
                {afficherPwd ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={chargement}
            className={styles.submitButton}
          >
            {chargement ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Vous n&apos;avez pas de compte ?{" "}
            <a href="/inscription">Inscrivez-vous</a>
          </p>
        </div>
      </div>
    </div>
  );
}