
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./creer.module.css";
import { obtenirApiFormateur } from "@/lib/api";
const API = obtenirApiFormateur();

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function FormulaireCreation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parametreFormation = searchParams.get("numFormation");

  const [formations, setFormations] = useState([]);
  const [modulesExistants, setModulesExistants] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [chargementModules, setChargementModules] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const [form, setForm] = useState({
    titreModule: "",
    descriptionModule: "",
    ordre: "1",
    numFormation: "",
    typeContenu: "video",
    urlContenu: ""
  });

  const formationSelectionnee = formations.find(
    (formation) => String(formation.numFormation) === String(form.numFormation)
  );

  useEffect(() => {
    let actif = true;

    async function chargerFormations() {
      try {
        const token = getToken();

        if (!token) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        const response = await fetch(`${API}/formations`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: "no-store"
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Impossible de charger les formations.");
        }

        const liste = Array.isArray(data)
          ? data
          : Array.isArray(data.formations)
            ? data.formations
            : [];

        if (!actif) return;

        setFormations(liste);

        if (
          parametreFormation &&
          liste.some(
            (formation) =>
              String(formation.numFormation) === String(parametreFormation)
          )
        ) {
          setForm((ancien) => ({
            ...ancien,
            numFormation: String(parametreFormation)
          }));
        }
      } catch (error) {
        if (actif) setErreur(error.message);
      } finally {
        if (actif) setChargement(false);
      }
    }

    chargerFormations();

    return () => {
      actif = false;
    };
  }, [parametreFormation]);

  useEffect(() => {
    let actif = true;

    async function chargerModules() {
      if (!form.numFormation) {
        setModulesExistants([]);
        setChargementModules(false);
        return;
      }

      setChargementModules(true);

      try {
        const response = await fetch(
          `${API}/modules?numFormation=${encodeURIComponent(form.numFormation)}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`
            },
            cache: "no-store"
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Impossible de charger les modules.");
        }

        const liste = Array.isArray(data)
          ? data
          : Array.isArray(data.modules)
            ? data.modules
            : [];

        const modules = liste
          .filter(
            (module) =>
              String(module.numFormation) === String(form.numFormation)
          )
          .sort((a, b) => Number(a.ordre) - Number(b.ordre));

        if (!actif) return;

        setModulesExistants(modules);

        const prochainOrdre =
          modules.reduce(
            (maximum, module) =>
              Math.max(maximum, Number(module.ordre) || 0),
            0
          ) + 1;

        setForm((ancien) => ({
          ...ancien,
          ordre: String(prochainOrdre)
        }));
      } catch (error) {
        if (actif) {
          setModulesExistants([]);
          setErreur(error.message);
        }
      } finally {
        if (actif) setChargementModules(false);
      }
    }

    chargerModules();

    return () => {
      actif = false;
    };
  }, [form.numFormation]);

  const modifierForm = (e) => {
    const { name, value } = e.target;

    if (name === "numFormation") {
      setModulesExistants([]);

      setForm((ancien) => ({
        ...ancien,
        numFormation: value,
        ordre: "1"
      }));
    } else {
      setForm((ancien) => ({
        ...ancien,
        [name]: value
      }));
    }

    setErreur("");
    setSucces("");
  };

  const enregistrer = async (e) => {
    e.preventDefault();

    setErreur("");
    setSucces("");

    if (!getToken()) {
      setErreur("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    if (!form.numFormation) {
      setErreur("Veuillez sélectionner une formation.");
      return;
    }

    if (!form.titreModule.trim()) {
      setErreur("Le titre du module est obligatoire.");
      return;
    }

    if (form.titreModule.trim().length > 150) {
      setErreur("Le titre ne doit pas dépasser 150 caractères.");
      return;
    }

    if (form.descriptionModule.length > 255) {
      setErreur("La description ne doit pas dépasser 255 caractères.");
      return;
    }

    if (!form.urlContenu.trim()) {
      setErreur("Veuillez ajouter le lien du contenu.");
      return;
    }

    const ordre = Number(form.ordre);

    if (!Number.isInteger(ordre) || ordre < 1) {
      setErreur("L'ordre doit être un entier positif.");
      return;
    }

    if (
      modulesExistants.some(
        (module) => Number(module.ordre) === ordre
      )
    ) {
      setErreur("Cet ordre existe déjà dans cette formation.");
      return;
    }

    setEnvoi(true);

    try {
      const response = await fetch(`${API}/modules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          titreModule: form.titreModule.trim(),
          descriptionModule: form.descriptionModule.trim(),
          ordre,
          numFormation: Number(form.numFormation),
          contenu: {
            type: form.typeContenu,
            url: form.urlContenu.trim()
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur pendant la création du module.");
      }

      setSucces("Module créé avec succès !");

      router.push(
        `/dashboard/formateur/modules?formation=${form.numFormation}`
      );

      router.refresh();
    } catch (error) {
      setErreur(error.message);
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emptyLessons}>
            Chargement des formations...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <Link
              href="/dashboard/formateur/modules"
              className={styles.back}
            >
              ← Retour aux modules
            </Link>

            <span className={styles.eyebrow}>ESPACE FORMATEUR</span>

            <h1>Créer un module</h1>

            <p>
              Ajoutez un module à votre formation avec une vidéo,
              un document PDF ou un lien pédagogique.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link
              href="/dashboard/formateur"
              className={styles.dashboardButton}
            >
              <span>⌂</span> Tableau de bord
            </Link>

            <div className={styles.headerIcon}>✦</div>
          </div>
        </header>

        {erreur && (
          <div className={styles.alertError}>⚠ {erreur}</div>
        )}

        {succes && (
          <div className={styles.alertSuccess}>✓ {succes}</div>
        )}

        <form onSubmit={enregistrer}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>01</div>

              <div>
                <h2>Formation et organisation</h2>
                <p>
                  Choisissez la formation et l&apos;ordre de votre module.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Formation associée <b>*</b></span>

                <select
                  name="numFormation"
                  value={form.numFormation}
                  onChange={modifierForm}
                  disabled={envoi}
                  required
                >
                  <option value="">Sélectionner une formation</option>

                  {formations.map((formation) => (
                    <option
                      key={formation.numFormation}
                      value={formation.numFormation}
                    >
                      {formation.titre}
                    </option>
                  ))}
                </select>
              </label>

              {formationSelectionnee && (
                <div className={`${styles.formationInfo} ${styles.fullWidth}`}>
                  <div className={styles.formationIcon}>📚</div>

                  <div>
                    <span>FORMATION SÉLECTIONNÉE</span>
                    <strong>{formationSelectionnee.titre}</strong>
                    <small>
                      {modulesExistants.length} module(s) existant(s)
                    </small>
                  </div>
                </div>
              )}

              <label className={styles.field}>
                <span>Ordre du module <b>*</b></span>

                <input
                  type="number"
                  name="ordre"
                  min="1"
                  value={form.ordre}
                  onChange={modifierForm}
                  disabled={!form.numFormation || envoi}
                  required
                />

                <small>Le numéro suivant est proposé automatiquement.</small>
              </label>

              <div className={styles.orderHelp}>
                <span>💡</span>
                <p>
                  Les modules sont organisés dans l&apos;ordre choisi
                  pour suivre progressivement la formation.
                </p>
              </div>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Titre du module <b>*</b></span>

                <input
                  type="text"
                  name="titreModule"
                  maxLength="150"
                  placeholder="Ex. : Introduction au HTML"
                  value={form.titreModule}
                  onChange={modifierForm}
                  required
                />

                <small>{form.titreModule.length}/150 caractères</small>
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Description du module</span>

                <textarea
                  name="descriptionModule"
                  maxLength="255"
                  rows="3"
                  placeholder="Décrivez brièvement ce module..."
                  value={form.descriptionModule}
                  onChange={modifierForm}
                />

                <small>{form.descriptionModule.length}/255 caractères</small>
              </label>
            </div>
          </section>

          {form.numFormation && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionNumber}>02</div>

                <div>
                  <h2>Modules de la formation</h2>
                  <p>
                    Consultez les modules déjà présents dans cette formation.
                  </p>
                </div>
              </div>

              {chargementModules ? (
                <div className={styles.loadingModules}>
                  <div className={styles.spinner}></div>
                  Chargement des modules...
                </div>
              ) : modulesExistants.length > 0 ? (
                <div className={styles.lessonList}>
                  {modulesExistants.map((module) => (
                    <div
                      className={styles.lessonItem}
                      key={module.codeModule}
                    >
                      <div className={styles.lessonNumber}>
                        {String(module.ordre).padStart(2, "0")}
                      </div>

                      <div className={styles.lessonDetails}>
                        <strong>{module.titreModule}</strong>
                        <span>Module {module.ordre}</span>
                      </div>

                      <span className={styles.lessonStatus}>
                        Déjà créé
                      </span>
                    </div>
                  ))}

                  <div className={styles.newLesson}>
                    <span>＋</span>
                    <div>
                      <strong>Nouveau module</strong>
                      <small>Ordre proposé : {form.ordre || "1"}</small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyLessons}>
                  <span>📚</span>
                  <strong>Aucun module pour le moment</strong>
                  <p>Cette formation est prête à recevoir son premier module.</p>
                  <small>Le premier module aura l&apos;ordre 1.</small>
                </div>
              )}
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>03</div>

              <div>
                <h2>Contenu pédagogique</h2>
                <p>
                  Choisissez un type de contenu et ajoutez son lien.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Type de contenu <b>*</b></span>

                <select
                  name="typeContenu"
                  value={form.typeContenu}
                  onChange={modifierForm}
                  required
                >
                  <option value="video">🎥 Vidéo</option>
                  <option value="pdf">📄 PDF</option>
                  <option value="url">🔗 Lien externe</option>
                </select>
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>
                  {form.typeContenu === "video"
                    ? "Lien de la vidéo"
                    : form.typeContenu === "pdf"
                      ? "Lien du PDF"
                      : "Lien pédagogique"}{" "}
                  <b>*</b>
                </span>

                <input
                  type="url"
                  name="urlContenu"
                  value={form.urlContenu}
                  onChange={modifierForm}
                  placeholder={
                    form.typeContenu === "video"
                      ? "https://www.youtube.com/watch?v=..."
                      : form.typeContenu === "pdf"
                        ? "https://.../document.pdf"
                        : "https://..."
                  }
                  required
                />

                <small>
                  {form.typeContenu === "video"
                    ? "Ajoutez le lien de la vidéo YouTube ou d'une autre plateforme."
                    : form.typeContenu === "pdf"
                      ? "Ajoutez un lien vers un PDF accessible en ligne."
                      : "Ajoutez le lien vers le site ou la ressource pédagogique."}
                </small>
              </label>
            </div>

            {form.urlContenu.trim() && (
              <div className={styles.formationInfo}>
                <div className={styles.formationIcon}>
                  {form.typeContenu === "video"
                    ? "🎥"
                    : form.typeContenu === "pdf"
                      ? "📄"
                      : "🔗"}
                </div>

                <div>
                  <span>CONTENU DU MODULE</span>
                  <strong>
                    {form.typeContenu === "video"
                      ? "Vidéo"
                      : form.typeContenu === "pdf"
                        ? "Document PDF"
                        : "Lien externe"}
                  </strong>
                  <small>{form.urlContenu}</small>
                </div>
              </div>
            )}
          </section>

          <footer className={styles.footer}>
            <Link
              href="/dashboard/formateur/modules"
              className={styles.cancelButton}
            >
              Annuler
            </Link>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={envoi || chargement || chargementModules}
            >
              {envoi ? "Enregistrement..." : "Créer le module →"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default function CreerModulePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <p>Chargement de l&apos;éditeur...</p>
        </main>
      }
    >
      <FormulaireCreation />
    </Suspense>
  );
}
