
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ajouter.module.css";

const API = "http://localhost:5000/api/utilisateur";

async function lireReponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Réponse invalide du serveur." };
  }
}

export default function AjouterUtilisateurPage() {
  const router = useRouter();

  const [formulaire, setFormulaire] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "apprenant",
    pwd: "",
  });

  const [confirmation, setConfirmation] = useState("");
  const [afficherPwd, setAfficherPwd] = useState(false);
  const [afficherConfirmation, setAfficherConfirmation] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");

  function modifierChamp(e) {
    setFormulaire(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function ajouterUtilisateur(e) {
    e.preventDefault();
    setErreur("");

    if (formulaire.pwd.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (formulaire.pwd !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    try {
      setEnregistrement(true);

      const token = localStorage.getItem("token");

      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          nom: formulaire.nom.trim(),
          prenom: formulaire.prenom.trim(),
          email: formulaire.email.trim(),
          role: formulaire.role,
          pwd: formulaire.pwd,
        }),
      });

      const data = await lireReponse(response);

      if (!response.ok) {
        throw new Error(data.message || data.erreur || "Impossible de créer cet utilisateur.");
      }

      router.push("/dashboard/admin/utilisateurs");
      router.refresh();
    } catch (error) {
      setErreur(error.message || "Une erreur est survenue.");
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ADMINISTRATION / UTILISATEURS</span>
          <h1>Ajouter un utilisateur</h1>
          <p>Créez un nouveau compte sur la plateforme Learning Pro.</p>
        </div>

        <Link href="/dashboard/admin/utilisateurs" className={styles.backButton}>
          ← Retour à la liste
        </Link>
      </header>

      <section className={styles.formCard}>
        <div className={styles.formHeader}>
          <div className={styles.formIcon}>＋</div>
          <div>
            <h2>Informations du compte</h2>
            <p>Remplissez les informations du nouvel utilisateur.</p>
          </div>
        </div>

        {erreur && <div className={styles.error}>{erreur}</div>}

        <form onSubmit={ajouterUtilisateur}>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="nom">Nom *</label>
              <input
                id="nom"
                name="nom"
                value={formulaire.nom}
                onChange={modifierChamp}
                placeholder="Entrez le nom"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="prenom">Prénom *</label>
              <input
                id="prenom"
                name="prenom"
                value={formulaire.prenom}
                onChange={modifierChamp}
                placeholder="Entrez le prénom"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Adresse email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formulaire.email}
                onChange={modifierChamp}
                placeholder="exemple@email.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="role">Rôle *</label>
              <select
                id="role"
                name="role"
                value={formulaire.role}
                onChange={modifierChamp}
                required
              >
                <option value="apprenant">Apprenant</option>
                <option value="formateur">Formateur</option>
                <option value="administrateur">Administrateur</option>
              </select>
              <small>Le rôle détermine les autorisations du compte.</small>
            </div>

            <div className={styles.field}>
              <label htmlFor="pwd">Mot de passe *</label>
              <div className={styles.passwordField}>
                <input
                  id="pwd"
                  name="pwd"
                  type={afficherPwd ? "text" : "password"}
                  value={formulaire.pwd}
                  onChange={modifierChamp}
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setAfficherPwd(v => !v)}>
                  {afficherPwd ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmation">Confirmer le mot de passe *</label>
              <div className={styles.passwordField}>
                <input
                  id="confirmation"
                  type={afficherConfirmation ? "text" : "password"}
                  value={confirmation}
                  onChange={e => setConfirmation(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  autoComplete="new-password"
                  required
                />
                <button type="button" onClick={() => setAfficherConfirmation(v => !v)}>
                  {afficherConfirmation ? "Masquer" : "Afficher"}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.note}>
            <strong>Information :</strong> le mot de passe sera sécurisé et chiffré par le backend.
          </div>

          <div className={styles.formActions}>
            <Link href="/dashboard/admin/utilisateurs" className={styles.cancelButton}>
              Annuler
            </Link>
            <button type="submit" className={styles.submitButton} disabled={enregistrement}>
              {enregistrement ? "Création en cours..." : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
      </section>

      <footer className={styles.footer}>Learning Pro · Création de compte</footer>
    </main>
  );
}
