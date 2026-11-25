
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./resultats.module.css";

import { obtenirApiApprenant } from "@/lib/api";
const API = obtenirApiApprenant();

export default function ResultatsPage() {
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState("tous");

  const chargerResultats = useCallback(async () => {
    try {
      setErreur("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const response = await fetch(`${API}/tentatives`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Impossible de charger les résultats."
        );
      }

      const liste = Array.isArray(data.tentatives)
        ? data.tentatives
        : Array.isArray(data)
          ? data
          : [];

      setResultats(liste);
    } catch (error) {
      setErreur(error.message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      chargerResultats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [chargerResultats]);

  const obtenirScore = (item) => {
    return Number(item.score ?? item.evaluation?.score ?? 0);
  };

  const estReussi = (item) => {
    const resultat = String(
      item.evaluation?.resultat ??
      item.resultat ??
      item.statut ??
      ""
    ).toLowerCase();

    if (
      ["réussi", "reussi", "admis", "valide", "validé"].includes(resultat)
    ) {
      return true;
    }

    if (
      ["échoué", "echoue", "refusé", "refuse"].includes(resultat)
    ) {
      return false;
    }

    const seuil = Number(
      item.quiz?.seuilReussite ??
      item.Quiz?.seuilReussite ??
      item.seuilReussite ??
      50
    );

    return obtenirScore(item) >= seuil;
  };

  const resultatFiltre = resultats.filter((item) => {
    if (filtre === "reussi") return estReussi(item);
    if (filtre === "echoue") return !estReussi(item);
    return true;
  });

  const moyenne = resultats.length
    ? Math.round(
        resultats.reduce(
          (total, item) => total + obtenirScore(item),
          0
        ) / resultats.length
      )
    : 0;

  const reussis = resultats.filter(estReussi).length;
  const echoues = resultats.length - reussis;

  const tauxReussite = resultats.length
    ? Math.round((reussis / resultats.length) * 100)
    : 0;

  const formaterDate = (date) => {
    if (!date) return "Date indisponible";

    const valeur = new Date(date);

    return Number.isNaN(valeur.getTime())
      ? "Date indisponible"
      : valeur.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
  };

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Chargement de vos résultats...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        <nav className={styles.topNavigation}>
          <Link
            href="/dashboard/apprenant"
            className={styles.backButton}
          >
            <span>←</span>
            Tableau de bord
          </Link>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={chargerResultats}
          >
            <span>↻</span>
            Actualiser
          </button>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              LEARNING PRO / ESPACE APPRENANT
            </span>

            <h1>Mes résultats</h1>

            <p>
              Analysez vos performances, consultez vos évaluations
              et mesurez votre progression au fil de vos formations.
            </p>
          </div>

          <div className={styles.heroDecoration}>
            <div className={styles.heroIcon}>↗</div>
            <span>Votre progression</span>
            <strong>{tauxReussite}%</strong>
            <small>de réussite</small>
          </div>
        </header>

        {erreur && (
          <div className={styles.error}>
            <span>!</span>
            <p>{erreur}</p>
            <button onClick={chargerResultats} type="button">
              Réessayer
            </button>
          </div>
        )}

        <section className={styles.stats}>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.purple}`}>
              <span>▤</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>
                Évaluations effectuées
              </span>
              <strong>{resultats.length}</strong>
              <small>Total des tentatives</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <span>✓</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>
                Évaluations réussies
              </span>
              <strong>{reussis}</strong>
              <small>Objectifs atteints</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orange}`}>
              <span>%</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>
                Score moyen
              </span>
              <strong>{moyenne}%</strong>
              <small>Moyenne de vos scores</small>
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.blue}`}>
              <span>◎</span>
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>
                Taux de réussite
              </span>
              <strong>{tauxReussite}%</strong>
              <small>{echoues} évaluation(s) échouée(s)</small>
            </div>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                SUIVI ACADÉMIQUE
              </span>
              <h2>Historique des évaluations</h2>
              <p>
                Consultez les résultats de vos différentes tentatives.
              </p>
            </div>

            <div className={styles.filterWrapper}>
              <label htmlFor="filtre">Filtrer par statut</label>
              <select
                id="filtre"
                value={filtre}
                onChange={(event) => setFiltre(event.target.value)}
                className={styles.filter}
              >
                <option value="tous">Tous les résultats</option>
                <option value="reussi">Réussis</option>
                <option value="echoue">Échoués</option>
              </select>
            </div>
          </div>

          {resultatFiltre.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>▤</div>
              <h3>Aucun résultat trouvé</h3>
              <p>
                {resultats.length === 0
                  ? "Vos résultats apparaîtront ici après vos premières évaluations."
                  : "Aucun résultat ne correspond au filtre sélectionné."}
              </p>
              <Link
                href="/dashboard/apprenant/quiz"
                className={styles.emptyButton}
              >
                Découvrir mes quiz
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className={styles.resultList}>
              {resultatFiltre.map((item, index) => {
                const score = obtenirScore(item);
                const reussi = estReussi(item);

                const nomQuiz =
                  item.quiz?.nomQuiz ||
                  item.Quiz?.nomQuiz ||
                  item.nomQuiz ||
                  `Évaluation ${index + 1}`;

                return (
                  <article
                    className={styles.resultCard}
                    key={item.idTentative || index}
                  >
                    <div className={styles.resultMain}>
                      <div className={styles.resultIcon}>
                        <span>Q</span>
                      </div>

                      <div className={styles.resultInfo}>
                        <h3>{nomQuiz}</h3>
                        <span className={styles.resultDate}>
                          <span>◷</span>
                          {formaterDate(item.dateTentative)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.score}>
                      <strong>{score}%</strong>
                      <div className={styles.progressTrack}>
                        <div
                          className={`${styles.progressFill} ${
                            reussi ? styles.progressSuccess : styles.progressFailed
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, score))}%`
                          }}
                        />
                      </div>
                      <span>Score obtenu</span>
                    </div>

                    <span
                      className={`${styles.status} ${
                        reussi ? styles.success : styles.failed
                      }`}
                    >
                      <span className={styles.statusDot}></span>
                      {reussi ? "Réussi" : "Échoué"}
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          {resultats.length > 0 && (
            <div className={styles.listFooter}>
              <span>
                {resultatFiltre.length} résultat(s) affiché(s)
              </span>
              <span>
                {resultats.length} tentative(s) au total
              </span>
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <span>LEARNING PRO</span>
          <p>Continuez à apprendre, progressez chaque jour.</p>
          <Link href="/dashboard/apprenant">
            Retour au tableau de bord →
          </Link>
        </footer>

      </div>
    </main>
  );
}
