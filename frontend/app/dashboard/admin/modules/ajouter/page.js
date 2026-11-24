
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ajouter.module.css";

const API = "http://localhost:5000/api/module";

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue.");
  }

  return data;
}

export default function AjouterModulePage() {
  const router = useRouter();

  const [formations, setFormations] = useState([]);
  const [form, setForm] = useState({
    titreModule: "",
    descriptionModule: "",
    ordre: "",
    numFormation: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function chargerFormations() {
      try {
        const data = await apiRequest(`${API}/formations`);

        if (!active) return;

        setFormations(
          Array.isArray(data)
            ? data
            : Array.isArray(data.formations)
              ? data.formations
              : []
        );
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    chargerFormations();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.titreModule.trim()) {
      setError("Le titre du module est obligatoire.");
      return;
    }

    if (!form.numFormation) {
      setError("Veuillez choisir une formation.");
      return;
    }

    if (!form.ordre || Number(form.ordre) < 1) {
      setError("Veuillez saisir un ordre valide.");
      return;
    }

    try {
      setSaving(true);

      await apiRequest(API, {
        method: "POST",
        body: JSON.stringify({
          titreModule: form.titreModule.trim(),
          descriptionModule: form.descriptionModule.trim(),
          ordre: Number(form.ordre),
          numFormation: Number(form.numFormation)
        })
      });

      router.push("/dashboard/admin/modules");
      router.refresh();
    } catch (err) {
      setError(err.message || "Impossible d'ajouter le module.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.dashboardLink}>
            ← Dashboard admin
          </Link>

          <h1>Ajouter un module</h1>
          <p>Créez un nouveau module dans une formation existante.</p>
        </div>

        <Link href="/dashboard/admin/modules" className={styles.backButton}>
          Retour aux modules
        </Link>
      </header>

      <section className={styles.formContainer}>
        <div className={styles.formHeading}>
          <div className={styles.formIcon}>＋</div>
          <div>
            <h2>Informations du module</h2>
            <p>Complétez les champs pour créer votre module.</p>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>Chargement des formations...</div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="titreModule">Titre du module *</label>
              <input
                id="titreModule"
                name="titreModule"
                value={form.titreModule}
                onChange={handleChange}
                placeholder="Exemple : Introduction à JavaScript"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="descriptionModule">Description</label>
              <textarea
                id="descriptionModule"
                name="descriptionModule"
                value={form.descriptionModule}
                onChange={handleChange}
                placeholder="Décrivez le contenu de ce module..."
                rows={5}
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="ordre">Ordre du module *</label>
                <input
                  id="ordre"
                  name="ordre"
                  type="number"
                  min="1"
                  value={form.ordre}
                  onChange={handleChange}
                  placeholder="Exemple : 1"
                  required
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="numFormation">Formation *</label>
                <select
                  id="numFormation"
                  name="numFormation"
                  value={form.numFormation}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choisir une formation</option>
                  {formations.map((formation) => (
                    <option
                      key={formation.numFormation}
                      value={formation.numFormation}
                    >
                      {formation.titre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formations.length === 0 && (
              <p className={styles.noFormation}>
                Aucune formation disponible. Créez d&apos;abord une formation.
              </p>
            )}

            <div className={styles.formActions}>
              <Link
                href="/dashboard/admin/modules"
                className={styles.cancelButton}
              >
                Annuler
              </Link>

              <button
                type="submit"
                disabled={saving || formations.length === 0}
                className={styles.submitButton}
              >
                {saving ? "Enregistrement..." : "Ajouter le module →"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
