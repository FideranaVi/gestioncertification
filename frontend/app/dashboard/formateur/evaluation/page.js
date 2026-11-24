
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./evaluations.module.css";

const API = "http://localhost:5000/api/formateur";

function obtenirToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

function formaterDate(date) {
  if (!date) return "—";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) return "—";

  return valeur.toLocaleDateString("fr-FR");
}

function obtenirResultat(evaluation) {
  const resultat = String(evaluation.resultat || "").toLowerCase();

  if (["reussi", "réussi"].includes(resultat)) return "reussi";
  if (["echoue", "échoué"].includes(resultat)) return "echoue";

  return "inconnu";
}

export default function EvaluationPage() {
  const [evaluations, setEvaluations] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [actualisation, setActualisation] = useState(0);

  useEffect(() => {
    let actif = true;

    const chargerEvaluations = async () => {
      try {
        const token = obtenirToken();

        if (!token) {
          throw new Error("Session expirée. Veuillez vous reconnecter.");
        }

        const params = new URLSearchParams();

        if (recherche.trim()) {
          params.set("search", recherche.trim());
        }

        if (filtre) {
          params.set("resultat", filtre);
        }

        const response = await fetch(
          `${API}/evaluations?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Impossible de charger les évaluations."
          );
        }

        if (actif) {
          setEvaluations(
            Array.isArray(data) ? data : data.evaluations || []
          );
          setErreur("");
        }
      } catch (error) {
        if (actif) {
          setErreur(error.message);
          setEvaluations([]);
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    };

    chargerEvaluations();

    return () => {
      actif = false;
    };
  }, [recherche, filtre, actualisation]);

  const total = evaluations.length;

  const reussites = evaluations.filter(
    (item) => obtenirResultat(item) === "reussi"
  ).length;

  const echecs = evaluations.filter(
    (item) => obtenirResultat(item) === "echoue"
  ).length;

  const moyenne = total
    ? (
        evaluations.reduce(
          (somme, item) => somme + Number(item.score || 0),
          0
        ) / total
      ).toFixed(1)
    : "0.0";

  function actualiser() {
    setChargement(true);
    setActualisation((ancienneValeur) => ancienneValeur + 1);
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <Link href="/dashboard/formateur">Tableau de bord</Link>
            <span>/</span>
            <span>Évaluations</span>
          </div>

          <h1>Gestion des évaluations</h1>

          <p>
            Consultez les résultats et suivez les performances de vos apprenants.
          </p>
        </div>

        <Link
          href="/dashboard/formateur/quiz"
          className={styles.createButton}
        >
          <span>+</span>
          Gérer les quiz
        </Link>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div>
            <span>Total des évaluations</span>
            <strong>{total}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.greenIcon}`}>✓</div>
          <div>
            <span>Réussites</span>
            <strong>{reussites}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.redIcon}`}>✕</div>
          <div>
            <span>Échecs</span>
            <strong>{echecs}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blueIcon}`}>%</div>
          <div>
            <span>Moyenne générale</span>
            <strong>{moyenne}%</strong>
          </div>
        </article>
      </section>

      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>Résultats des apprenants</h2>
            <p>Liste des évaluations effectuées par vos apprenants.</p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={actualiser}
            disabled={chargement}
          >
            ↻ Actualiser
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <span>⌕</span>

            <input
              type="search"
              placeholder="Rechercher un apprenant ou un quiz..."
              value={recherche}
              onChange={(event) => setRecherche(event.target.value)}
            />
          </div>

          <select
            value={filtre}
            onChange={(event) => setFiltre(event.target.value)}
          >
            <option value="">Tous les résultats</option>
            <option value="reussi">Réussis</option>
            <option value="echoue">Échoués</option>
          </select>
        </div>

        {erreur && (
          <div className={styles.error}>
            <span>⚠</span>
            <p>{erreur}</p>

            <button type="button" onClick={actualiser}>
              Réessayer
            </button>
          </div>
        )}

        {chargement ? (
          <div className={styles.empty}>
            <div className={styles.loader}></div>
            <p>Chargement des évaluations...</p>
          </div>
        ) : erreur ? null : evaluations.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📊</div>
            <h3>Aucune évaluation disponible</h3>
            <p>
              Les résultats apparaîtront ici lorsque les apprenants auront
              effectué leurs quiz.
            </p>

            <Link
              href="/dashboard/formateur/quiz"
              className={styles.emptyButton}
            >
              Consulter les quiz
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Quiz</th>
                  <th>Module</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Seuil</th>
                  <th>Résultat</th>
                </tr>
              </thead>

              <tbody>
                {evaluations.map((evaluation, index) => {
                  const tentative =
                    evaluation.tentative ||
                    evaluation.TentativeQuiz ||
                    {};

                  const apprenant =
                    tentative.apprenant ||
                    tentative.Utilisateur ||
                    {};

                  const quiz =
                    tentative.quiz ||
                    evaluation.quiz ||
                    evaluation.Quiz ||
                    {};

                  const moduleData =
                    quiz.module ||
                    quiz.Module ||
                    {};

                  const nomApprenant = [
                    apprenant.prenom || "",
                    apprenant.nom || ""
                  ].filter(Boolean).join(" ") || "Apprenant";

                  const resultat = obtenirResultat(evaluation);

                  return (
                    <tr
                      key={
                        evaluation.codeEvaluation ||
                        evaluation.idEvaluation ||
                        index
                      }
                    >
                      <td>
                        <div className={styles.student}>
                          <div className={styles.avatar}>
                            {nomApprenant.charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <strong>{nomApprenant}</strong>
                            <small>{apprenant.email || "—"}</small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>{quiz.nomQuiz || "Quiz"}</strong>
                      </td>

                      <td>
                        <div className={styles.moduleInfo}>
                          <strong>
                            {moduleData.titreModule || "—"}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {formaterDate(
                          evaluation.dateEvaluation ||
                          evaluation.createdAt ||
                          tentative.dateTentative
                        )}
                      </td>

                      <td>
                        <strong className={styles.score}>
                          {evaluation.score ?? 0}%
                        </strong>
                      </td>

                      <td>
                        {quiz.seuilReussite ?? "—"}
                        {quiz.seuilReussite != null ? "%" : ""}
                      </td>

                      <td>
                        {resultat === "inconnu" ? (
                          <span className={styles.pending}>
                            Non déterminé
                          </span>
                        ) : (
                          <span
                            className={`${styles.status} ${
                              resultat === "reussi"
                                ? styles.success
                                : styles.failure
                            }`}
                          >
                            {resultat === "reussi"
                              ? "✓ Réussi"
                              : "✕ Échoué"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.footer}>
          <span>
            {total} résultat{total !== 1 ? "s" : ""}
          </span>
          <span>LearningPro · Gestion des évaluations</span>
        </div>
      </section>
    </main>
  );
}
