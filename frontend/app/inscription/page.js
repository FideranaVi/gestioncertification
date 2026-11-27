"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenirApiAuth } from "@/lib/api";
import styles from "./inscription.module.css";

const API = obtenirApiAuth();

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", pwd: "", confirmation: "" });
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficher, setAfficher] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setErreur(""); setMessage("");
    if (form.pwd !== form.confirmation) { setErreur("Les mots de passe ne correspondent pas."); return; }
    if (form.pwd.length < 8) { setErreur("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setChargement(true);
    try {
      const response = await fetch(`${API}/inscription`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom: form.nom.trim(), prenom: form.prenom.trim(), email: form.email.trim().toLowerCase(), pwd: form.pwd }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Erreur lors de l'inscription.");
      if (!data.token || !data.utilisateur) throw new Error("Réponse du serveur invalide.");
      const utilisateur = { ...data.utilisateur, role: "apprenant" };
      localStorage.removeItem("token"); localStorage.removeItem("utilisateur"); sessionStorage.removeItem("token"); sessionStorage.removeItem("utilisateur");
      localStorage.setItem("token", data.token); localStorage.setItem("utilisateur", JSON.stringify(utilisateur));
      sessionStorage.setItem("token", data.token); sessionStorage.setItem("utilisateur", JSON.stringify(utilisateur));
      setMessage("Inscription réussie ! Bienvenue sur Learning Pro.");
      router.replace("/dashboard/apprenant");
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
          <h1 className={styles.title}>Créer un compte apprenant</h1>
          <p className={styles.subtitle}>Inscrivez-vous gratuitement pour accéder aux formations, suivre votre progression et obtenir vos certificats.</p>

          {erreur && <div className={styles.error}>{erreur}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Nom</label>
                <input type="text" name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" maxLength={50} required className={styles.input} />
              </div>
              <div className={styles.field}>
                <label>Prénom</label>
                <input type="text" name="prenom" value={form.prenom} onChange={handleChange} placeholder="Votre prénom" maxLength={50} required className={styles.input} />
              </div>
            </div>

            <div className={styles.field}>
              <label>Adresse email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="exemple@email.com" maxLength={100} required className={styles.input} />
            </div>

            <div className={styles.field}>
              <label>Mot de passe</label>
              <div className={styles.passwordWrap}>
                <input type={afficher ? "text" : "password"} name="pwd" value={form.pwd} onChange={handleChange} placeholder="Minimum 8 caractères" minLength={8} required className={styles.input} />
                <button type="button" onClick={() => setAfficher((p) => !p)} className={styles.toggleBtn}>{afficher ? "Masquer" : "Afficher"}</button>
              </div>
              <p className={styles.hint}>Utilisez au moins 8 caractères pour sécuriser votre compte.</p>
            </div>

            <div className={styles.field}>
              <label>Confirmer le mot de passe</label>
              <input type={afficher ? "text" : "password"} name="confirmation" value={form.confirmation} onChange={handleChange} placeholder="Confirmez votre mot de passe" minLength={8} required className={styles.input} />
            </div>

            <button type="submit" disabled={chargement} className={styles.primaryBtn}>{chargement ? "Inscription en cours..." : "Créer mon compte"}</button>
          </form>

          <div className={styles.divider}><span>ou</span></div>
          <p className={styles.bottomText}>Vous avez déjà un compte ? <Link href="/connexion">Se connecter</Link></p>
          <Link href="/" className={styles.backLink}>← Retour à l&apos;accueil</Link>
        </div>
        <p className={styles.footerNote}>En vous inscrivant, vous acceptez d&apos;utiliser Learning Pro pour suivre vos formations.</p>
      </div>
    </main>
  );
}