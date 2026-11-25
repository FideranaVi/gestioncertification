
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./modifier.module.css";

import { obtenirApiAdmin } from "@/lib/api";
const API = obtenirApiAdmin();

async function lireReponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Réponse invalide du serveur." };
  }
}

function ModifierFormulaire() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "",
    pwd: ""
  });

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => {
    let actif = true;

    async function chargerUtilisateur() {
      if (!id) {
        setErreur("Identifiant utilisateur manquant.");
        setChargement(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        const response = await fetch(`${API}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        });

        const data = await lireReponse(response);

        if (!response.ok) {
          throw new Error(
            data.message || "Impossible de récupérer cet utilisateur."
          );
        }

        const utilisateur = data.utilisateur || data;

        if (actif) {
          setForm({
            nom: utilisateur.nom || "",
            prenom: utilisateur.prenom || "",
            email: utilisateur.email || "",
            role: utilisateur.role || "",
            pwd: ""
          });
        }
      } catch (error) {
        if (actif) setErreur(error.message);
      } finally {
        if (actif) setChargement(false);
      }
    }

    chargerUtilisateur();

    return () => {
      actif = false;
    };
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function modifierUtilisateur(e) {
    e.preventDefault();

    setErreur("");
    setSucces("");

    if (
      !form.nom.trim() ||
      !form.prenom.trim() ||
      !form.email.trim() ||
      !form.role
    ) {
      setErreur("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    if (form.pwd && form.pwd.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    try {
      setEnregistrement(true);

      const token = localStorage.getItem("token");

      const modifications = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role
      };

      if (form.pwd.trim()) {
        modifications.pwd = form.pwd;
      }

      const response = await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`
        },
        body: JSON.stringify(modifications)
      });

      const data = await lireReponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la modification."
        );
      }

      setSucces(data.message || "Utilisateur modifié avec succès.");

      setTimeout(() => {
        router.push("/dashboard/admin/utilisateurs");
        router.refresh();
      }, 1000);

    } catch (error) {
      setErreur(error.message);
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) {
    return (
      <div className={styles.loading}>
        Chargement des informations...
      </div>
    );
  }

  if (erreur && !form.nom && !form.prenom && !form.email) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>{erreur}</div>
          <Link
            href="/dashboard/admin/utilisateurs"
            className={styles.backButton}
          >
            ← Retour aux utilisateurs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.subtitle}>
              ESPACE ADMINISTRATEUR
            </span>
            <h1>Modifier un utilisateur</h1>
            <p>Actualisez les informations du compte utilisateur.</p>
          </div>

          <Link
            href="/dashboard/admin/utilisateurs"
            className={styles.backButton}
          >
            ← Retour
          </Link>
        </header>

        <form onSubmit={modifierUtilisateur} className={styles.form}>
          <div className={styles.formHeader}>
            <div className={styles.avatar}>
              {form.nom.charAt(0).toUpperCase() || "U"}
            </div>

            <div>
              <h2>Informations personnelles</h2>
              <p>Compte utilisateur #{id}</p>
            </div>
          </div>

          {erreur && (
            <div className={styles.error} role="alert">
              {erreur}
            </div>
          )}

          {succes && (
            <div className={styles.success} role="status">
              {succes}
            </div>
          )}

          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="nom">Nom *</label>
              <input
                id="nom"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Nom"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="prenom">Prénom *</label>
              <input
                id="prenom"
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                placeholder="Prénom"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Adresse email *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="exemple@email.com"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="role">Rôle *</label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                required
              >
                <option value="">Choisir un rôle</option>
                <option value="administrateur">Administrateur</option>
                <option value="formateur">Formateur</option>
                <option value="apprenant">Apprenant</option>
              </select>
            </div>
          </div>

          <section className={styles.passwordSection}>
            <h3>Changer le mot de passe</h3>
            <p>
              Laissez vide pour conserver le mot de passe actuel.
            </p>

            <div className={styles.field}>
              <label htmlFor="pwd">Nouveau mot de passe</label>
              <input
                id="pwd"
                name="pwd"
                type="password"
                value={form.pwd}
                onChange={handleChange}
                placeholder="Minimum 8 caractères"
                minLength={8}
              />
            </div>
          </section>

          <div className={styles.actions}>
            <Link
              href="/dashboard/admin/utilisateurs"
              className={styles.cancelButton}
            >
              Annuler
            </Link>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={enregistrement}
            >
              {enregistrement
                ? "Enregistrement..."
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function ModifierUtilisateurPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ModifierFormulaire />
    </Suspense>
  );
}
