"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenirApiAuth } from "@/lib/api";
import styles from "./connexion.module.css";

const API = obtenirApiAuth();

export default function ConnexionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", pwd: "" });
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficher, setAfficher] = useState(false);
  const [chargementGoogle, setChargementGoogle] = useState(false);
  const googleDivRef = useRef(null);
  const googleInitRef = useRef(false);

  const sauvegarderSession = (data) => {
    const utilisateur = { ...data.utilisateur, role: data.utilisateur.role };
    localStorage.removeItem("token"); localStorage.removeItem("utilisateur"); localStorage.removeItem("user");
    sessionStorage.removeItem("token"); sessionStorage.removeItem("utilisateur"); sessionStorage.removeItem("user");
    localStorage.setItem("token", data.token);
    localStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    localStorage.setItem("user", JSON.stringify(utilisateur));
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    sessionStorage.setItem("user", JSON.stringify(utilisateur));
    return utilisateur;
  };

  const handleGoogle = async (response) => {
    setErreur(""); setChargementGoogle(true);
    try {
      const res = await fetch(`${API}/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: response.credential }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Connexion Google échouée.");
      if (!data.token || !data.utilisateur) throw new Error("Réponse du serveur invalide.");
      sauvegarderSession(data);
      router.replace(data.redirectTo || "/dashboard/apprenant");
    } catch (error) {
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") setErreur("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez (le serveur Render peut mettre 30s à se réveiller).");
      else setErreur(error.message || "Impossible de se connecter avec Google.");
    } finally { setChargementGoogle(false); }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (googleInitRef.current) return;
      if (!window.google || !googleDivRef.current) return;
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) { setErreur("NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant dans .env.local du frontend."); return; }
      googleInitRef.current = true;
      window.google.accounts.id.initialize({ client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback: handleGoogle, use_fedcm_for_prompt: false, auto_select: false });
      window.google.accounts.id.renderButton(googleDivRef.current, { theme: "outline", size: "large", width: 400, text: "continue_with", shape: "rectangular" });
    };
    if (window.google) { initGoogle(); return; }
    if (document.getElementById("google-script")) {
      const interval = setInterval(() => { if (window.google) { initGoogle(); clearInterval(interval); } }, 100);
      return () => clearInterval(interval);
    }
    const script = document.createElement("script");
    script.id = "google-script"; script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.onload = initGoogle;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setErreur(""); setChargement(true);
    try {
      const response = await fetch(`${API}/connexion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email.trim().toLowerCase(), pwd: form.pwd }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Erreur lors de la connexion.");
      if (!data.token || !data.utilisateur) throw new Error("Réponse du serveur invalide.");
      sauvegarderSession(data);
      router.replace(data.redirectTo || "/dashboard/apprenant");
    } catch (error) {
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") setErreur("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez (le serveur Render peut mettre 30s à se réveiller).");
      else setErreur(error.message || "Impossible de contacter le serveur.");
    } finally { setChargement(false); }
  };

  return (
    <main className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.logoWrap}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>L</span>
            <span className={styles.logoText}>Learning <span>Pro</span></span>
          </Link>
          <p className={styles.logoSubtitle}>Apprenez. Progressez. Réussissez.</p>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Se connecter</h1>
          <p className={styles.subtitle}>Connectez-vous pour accéder à vos formations et à votre progression.</p>

          {erreur && <div className={styles.error}>{erreur}</div>}

          {/* EMAIL EN HAUT */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>Adresse email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="exemple@email.com" required className={styles.input} />
            </div>
            <div className={styles.field}>
              <label>Mot de passe</label>
              <div className={styles.passwordWrap}>
                <input type={afficher ? "text" : "password"} name="pwd" value={form.pwd} onChange={handleChange} placeholder="Votre mot de passe" required className={styles.input} />
                <button type="button" onClick={() => setAfficher((p) => !p)} className={styles.toggleBtn}>{afficher ? "Masquer" : "Afficher"}</button>
              </div>
            </div>
            <button type="submit" disabled={chargement} className={styles.primaryBtn}>{chargement ? "Connexion en cours..." : "Se connecter"}</button>
          </form>

          {/* SEPARATEUR */}
          <div className={styles.divider}><span>ou continuer avec</span></div>

          {/* GOOGLE EN BAS */}
          <div className={styles.googleWrap}><div ref={googleDivRef}></div></div>
          {chargementGoogle && <p className={styles.googleLoading}>Connexion Google en cours...</p>}

          <p className={styles.bottomText}>Vous n&apos;avez pas de compte ? <Link href="/inscription">S&apos;inscrire</Link></p>
          <Link href="/" className={styles.backLink}>← Retour à l&apos;accueil</Link>
        </div>
        <p className={styles.footerNote}>Bienvenue sur Learning Pro — votre espace de formation.</p>
      </div>
    </main>
  );
}