
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./modifier.module.css";

import { obtenirApiFormateur } from "@/lib/api";
const API = obtenirApiFormateur();

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function lireContenu(contenu) {
  if (!contenu) return { type: "video", url: "" };

  let data = contenu;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return { type: "url", url: "" };
    }
  }

  if (Array.isArray(data)) {
    return { type: "url", url: "" };
  }

  if (!data || typeof data !== "object") {
    return { type: "video", url: "" };
  }

  const type = ["video", "pdf", "url"].includes(
    String(data.type || "").toLowerCase()
  )
    ? String(data.type).toLowerCase()
    : "video";

  return {
    type,
    url: typeof data.url === "string" ? data.url : ""
  };
}

function FormulaireModification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [formations, setFormations] = useState([]);
  const [modulesExistants, setModulesExistants] = useState([]);
  const [moduleOriginal, setModuleOriginal] = useState(null);

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
    (formation) =>
      String(formation.numFormation) === String(form.numFormation)
  );

  useEffect(() => {
    const controller = new AbortController();
    let actif = true;

    async function chargerDonnees() {
      try {
        setChargement(true);
        setErreur("");

        const token = getToken();

        if (!token) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        if (!id) {
          throw new Error("Identifiant du module introuvable.");
        }

        const headers = {
          Authorization: `Bearer ${token}`
        };

        const [reponseFormations, reponseModule] = await Promise.all([
          fetch(`${API}/formations`, {
            headers,
            cache: "no-store",
            signal: controller.signal
          }),

          fetch(`${API}/modules/${id}`, {
            headers,
            cache: "no-store",
            signal: controller.signal
          })
        ]);

        const [dataFormations, dataModule] = await Promise.all([
          reponseFormations.json().catch(() => ({})),
          reponseModule.json().catch(() => ({}))
        ]);

        if (!reponseFormations.ok) {
          throw new Error(
            dataFormations.message || "Impossible de charger les formations."
          );
        }

        if (!reponseModule.ok) {
          throw new Error(
            dataModule.message || "Impossible de charger ce module."
          );
        }

        const listeFormations = Array.isArray(dataFormations)
          ? dataFormations
          : Array.isArray(dataFormations.formations)
            ? dataFormations.formations
            : [];

        const moduleData = dataModule.module || dataModule;

        if (!moduleData || !moduleData.codeModule) {
          throw new Error("Module introuvable.");
        }

        if (!actif) return;

        const contenu = lireContenu(moduleData.contenu);

        setFormations(listeFormations);
        setModuleOriginal(moduleData);

        setForm({
          titreModule: moduleData.titreModule || "",
          descriptionModule: moduleData.descriptionModule || "",
          ordre: String(moduleData.ordre || 1),
          numFormation: String(moduleData.numFormation || ""),
          typeContenu: contenu.type,
          urlContenu: contenu.url
        });
      } catch (error) {
        if (actif && error.name !== "AbortError") {
          setErreur(error.message);
        }
      } finally {
        if (actif) setChargement(false);
      }
    }

    chargerDonnees();

    return () => {
      actif = false;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    let actif = true;

    async function chargerModules() {
      if (!form.numFormation || !moduleOriginal) {
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
              String(module.numFormation) === String(form.numFormation) &&
              String(module.codeModule) !== String(id)
          )
          .sort((a, b) => Number(a.ordre) - Number(b.ordre));

        if (!actif) return;

        setModulesExistants(modules);

        if (
          String(form.numFormation) !==
          String(moduleOriginal.numFormation)
        ) {
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
        }
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
  }, [form.numFormation, moduleOriginal, id]);

  const modifierForm = (e) => {
    const { name, value } = e.target;

    setForm((ancien) => ({
      ...ancien,
      [name]: value
    }));

    setErreur("");
    setSucces("");
  };

  const changerFormation = (e) => {
    const numFormation = e.target.value;

    setErreur("");
    setSucces("");
    setModulesExistants([]);

    const memeFormation =
      String(numFormation) === String(moduleOriginal?.numFormation);

    setForm((ancien) => ({
      ...ancien,
      numFormation,
      ordre: memeFormation
        ? String(moduleOriginal?.ordre || 1)
        : "1"
    }));
  };

  const enregistrer = async (e) => {
    e.preventDefault();

    setErreur("");
    setSucces("");

    if (!getToken()) {
      setErreur("Session expirée. Veuillez vous reconnecter.");
      return;
    }

    if (!id || !moduleOriginal) {
      setErreur("Module introuvable.");
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
      setErreur("Veuillez ajouter le lien du contenu pédagogique.");
      return;
    }

    const ordre = Number(form.ordre);

    if (!Number.isInteger(ordre) || ordre < 1) {
      setErreur("L'ordre doit être un entier positif.");
      return;
    }

    if (chargementModules) {
      setErreur("Veuillez attendre le chargement des autres modules.");
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
      const response = await fetch(`${API}/modules/${id}`, {
        method: "PUT",
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
        throw new Error(
          data.message || "Erreur pendant la modification du module."
        );
      }

      setSucces("Module modifié avec succès !");

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
            Chargement du module...
          </div>
        </div>
      </main>
    );
  }

  if (erreur && !moduleOriginal) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.alertError}>{erreur}</div>

          <Link
            href="/dashboard/formateur/modules"
            className={styles.cancelButton}
          >
            ← Retour aux modules
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
            <Link
              href="/dashboard/formateur/modules"
              className={styles.back}
            >
              ← Retour aux modules
            </Link>

            <span className={styles.eyebrow}>
              ESPACE FORMATEUR
            </span>

            <h1>Modifier un module</h1>

            <p>
              Modifiez le titre, la description, l&apos;ordre et le contenu pédagogique.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link
              href="/dashboard/formateur"
              className={styles.dashboardButton}
            >
              <span>⌂</span> Tableau de bord
            </Link>

            <div className={styles.headerIcon}>✎</div>
          </div>
        </header>

        {erreur && (
          <div className={styles.alertError}>
            ⚠ {erreur}
          </div>
        )}

        {succes && (
          <div className={styles.alertSuccess}>
            ✓ {succes}
          </div>
        )}

        <form onSubmit={enregistrer}>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div className={styles.sectionNumber}>01</div>

              <div>
                <h2>Formation et organisation</h2>
                <p>
                  Modifiez la formation associée et l&apos;ordre du module.
                </p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Formation associée <b>*</b></span>

                <select
                  name="numFormation"
                  value={form.numFormation}
                  onChange={changerFormation}
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
                      {modulesExistants.length} autre(s) module(s)
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
                  required
                />

                <small>
                  Modifiez la position du module dans la formation.
                </small>
              </label>

              <div className={styles.orderHelp}>
                <span>💡</span>
                <p>
                  Chaque module doit avoir un ordre unique dans la formation.
                </p>
              </div>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Titre du module <b>*</b></span>

                <input
                  type="text"
                  name="titreModule"
                  maxLength="150"
                  value={form.titreModule}
                  onChange={modifierForm}
                  placeholder="Ex. : Introduction au HTML"
                  required
                />

                <small>
                  {form.titreModule.length}/150 caractères
                </small>
              </label>

              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Description du module</span>

                <textarea
                  name="descriptionModule"
                  maxLength="255"
                  rows="3"
                  value={form.descriptionModule}
                  onChange={modifierForm}
                  placeholder="Décrivez brièvement ce module..."
                />

                <small>
                  {form.descriptionModule.length}/255 caractères
                </small>
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
                    Consultez les autres modules de cette formation.
                  </p>
                </div>
              </div>

              {chargementModules ? (
                <div className={styles.loadingModules}>
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
                        Autre module
                      </span>
                    </div>
                  ))}

                  <div className={styles.newLesson}>
                    <span>✎</span>

                    <div>
                      <strong>Module en modification</strong>
                      <small>
                        Nouvel ordre : {form.ordre}
                      </small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyLessons}>
                  <span>📚</span>
                  <strong>Aucun autre module</strong>
                  <p>Ce module est le seul de cette formation pour le moment.</p>
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
                  Modifiez la vidéo, le PDF ou le lien associé au module.
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
                    ? "Ajoutez le lien vers la vidéo."
                    : form.typeContenu === "pdf"
                      ? "Ajoutez le lien vers un PDF accessible en ligne."
                      : "Ajoutez le lien vers une ressource pédagogique."}
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
              disabled={envoi || chargementModules}
            >
              {envoi
                ? "Enregistrement..."
                : "Enregistrer les modifications →"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default function ModifierModulePage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <p>Chargement de l&apos;éditeur...</p>
        </main>
      }
    >
      <FormulaireModification />
    </Suspense>
  );
}
