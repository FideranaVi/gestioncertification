"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./quiz.module.css";

import { obtenirApiFormateur } from "@/lib/api";
const API = obtenirApiFormateur();

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function requete(url, options = {}) {
  const token = obtenirToken();
  if (!token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    cache: "no-store",
  });

  const texte = await response.text().catch(() => "");
  let data = {};
  if (texte) {
    try {
      data = JSON.parse(texte);
    } catch {
      data = { message: texte };
    }
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.erreur || `Erreur HTTP ${response.status}`
    );
  }
  return data;
}

function extraireQuiz(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.quizzes)) return data.quizzes;
  if (Array.isArray(data?.quiz)) return data.quiz;
  if (Array.isArray(data?.donnees)) return data.donnees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function obtenirFormation(quiz) {
  const formation =
    quiz.formation ||
    quiz.module?.formation ||
    quiz.Formation ||
    {};

  const numFormation =
    quiz.numFormation ??
    formation.numFormation ??
    quiz.module?.numFormation ??
    null;

  const titre =
    formation.titre ||
    formation.titreFormation ||
    quiz.titreFormation ||
    quiz.nomFormation ||
    (numFormation ? `Formation ${numFormation}` : "Formation non associée");

  return {
    numFormation,
    titre,
    key: numFormation !== null ? String(numFormation) : `nom-${titre}`,
  };
}

function estQuiz(quiz) {
  const type = String(quiz.typeQuiz || "").trim().toLowerCase();
  if (type) {
    return type === "final";
  }
  return (
    quiz.numFormation != null ||
    quiz.formation?.numFormation != null ||
    quiz.Formation?.numFormation != null ||
    quiz.module?.formation?.numFormation != null
  );
}

function Icon({ name, size = 20 }) {
  const icons = {
    back: (
      <g>
        <path d="m15 18-6-6 6-6" />
        <path d="M20 12H9" />
      </g>
    ),
    plus: (
      <g>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </g>
    ),
    search: (
      <g>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </g>
    ),
    book: (
      <g>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </g>
    ),
    clock: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </g>
    ),
    target: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </g>
    ),
    edit: (
      <g>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </g>
    ),
    trash: (
      <g>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </g>
    ),
    refresh: (
      <g>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M5.6 9a7 7 0 0 1 11.5-2L20 12M4 12l2.9 5a7 7 0 0 0 11.5-2" />
      </g>
    ),
    empty: (
      <g>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M8 9h8M8 13h5M8 17h3" />
      </g>
    ),
    alert: (
      <g>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </g>
    ),
    close: (
      <g>
        <path d="m18 6-12 12M6 6l12 12" />
      </g>
    ),
    quiz: (
      <g>
        <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5H8Z" />
        <path d="M14 3v6h7M8 13h8M8 17h6" />
      </g>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || icons.quiz}
    </svg>
  );
}

export default function GestionQuizPage() {
  const router = useRouter();

  const [quiz, setQuiz] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState(null);
  const [quizASupprimer, setQuizASupprimer] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ CHARGEMENT - sans useCallback, sans setState synchrone
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let ignore = false;

    async function chargerQuiz() {
      await Promise.resolve();
      if (signal.aborted || ignore) return;

      if (!obtenirToken()) {
        if (!ignore) setChargement(false);
        router.replace("/connexion");
        return;
      }

      try {
        const data = await requete("/quiz", { signal });
        if (signal.aborted || ignore) return;

        const liste = extraireQuiz(data);
        setQuiz(liste.filter(estQuiz));
        setErreur("");
      } catch (error) {
        if (error?.name === "AbortError" || signal.aborted || ignore) return;
        setErreur(error.message || "Impossible de charger les quiz.");
      } finally {
        if (!signal.aborted && !ignore) setChargement(false);
      }
    }

    chargerQuiz();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [router, refreshKey]);

  const quizFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return quiz;
    return quiz.filter((item) => {
      const formation = obtenirFormation(item);
      return (
        String(item.nomQuiz || "").toLowerCase().includes(terme) ||
        String(item.descriptionQuiz || "").toLowerCase().includes(terme) ||
        formation.titre.toLowerCase().includes(terme) ||
        String(formation.numFormation || "").includes(terme)
      );
    });
  }, [quiz, recherche]);

  const formationsAvecQuiz = useMemo(() => {
    const groupes = new Map();
    quizFiltres.forEach((item) => {
      const formation = obtenirFormation(item);
      if (!groupes.has(formation.key)) {
        groupes.set(formation.key, { ...formation, quizzes: [] });
      }
      groupes.get(formation.key).quizzes.push(item);
    });
    return Array.from(groupes.values()).sort((a, b) =>
      a.titre.localeCompare(b.titre, "fr")
    );
  }, [quizFiltres]);

  const totalQuiz = quiz.length;

  const totalFormations = useMemo(() => {
    return new Set(
      quiz
        .map((item) => obtenirFormation(item))
        .filter((formation) => formation.numFormation !== null)
        .map((formation) => String(formation.numFormation))
    ).size;
  }, [quiz]);

  const dureeTotale = useMemo(() => {
    return quiz.reduce((total, item) => total + Number(item.duree || 0), 0);
  }, [quiz]);

  async function supprimerQuiz() {
    if (!quizASupprimer) return;
    const codeQuiz = quizASupprimer.codeQuiz;
    if (codeQuiz == null) {
      setErreur("Impossible d'identifier ce quiz à supprimer.");
      setQuizASupprimer(null);
      return;
    }
    try {
      setSuppression(codeQuiz);
      await requete(`/quiz/${encodeURIComponent(codeQuiz)}`, { method: "DELETE" });
      setQuiz((anciens) =>
        anciens.filter((item) => String(item.codeQuiz) !== String(codeQuiz))
      );
      setQuizASupprimer(null);
      setErreur("");
    } catch (error) {
      setErreur(error.message || "La suppression a échoué.");
      setQuizASupprimer(null);
    } finally {
      setSuppression(null);
    }
  }

  // ✅ Actualiser sans rappeler chargerQuiz() directement
  function actualiser() {
    setErreur("");
    setChargement(true);
    setRefreshKey((ancien) => ancien + 1);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/dashboard/formateur" className={styles.backLink}>
          <Icon name="back" size={18} />
          Retour au tableau de bord
        </Link>

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              ESPACE FORMATEUR
            </div>
            <h1 className={styles.title}>Gestion des quiz</h1>
            <p className={styles.subtitle}>Gérez un quiz pour chaque formation.</p>
          </div>
          <Link href="/dashboard/formateur/quiz/creer" className={styles.createButton}>
            <Icon name="plus" size={19} />
            Créer un quiz
          </Link>
        </header>

        {erreur && (
          <div className={styles.errorAlert} role="alert">
            <Icon name="alert" size={20} />
            <span>{erreur}</span>
            <button type="button" className={styles.retryButton} onClick={actualiser}>
              Réessayer
            </button>
          </div>
        )}

        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.greenIcon}`}>
              <Icon name="quiz" size={23} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total des quiz</span>
              <strong className={styles.statValue}>{chargement ? "—" : totalQuiz}</strong>
              <span className={styles.statDescription}>Quiz créés</span>
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.mintIcon}`}>
              <Icon name="book" size={23} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Formations concernées</span>
              <strong className={styles.statValue}>{chargement ? "—" : totalFormations}</strong>
              <span className={styles.statDescription}>Formations avec un quiz</span>
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
              <Icon name="clock" size={23} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Durée cumulée</span>
              <strong className={styles.statValue}>
                {chargement ? "—" : dureeTotale}
                {!chargement && <small> min</small>}
              </strong>
              <span className={styles.statDescription}>Temps total des quiz</span>
            </div>
          </article>
        </section>

        <section className={styles.contentSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Quiz par formation</h2>
              <p className={styles.sectionSubtitle}>Chaque formation possède son propre quiz.</p>
            </div>
            <button type="button" className={styles.refreshButton} onClick={actualiser} disabled={chargement}>
              <span className={chargement ? styles.spinning : ""}>
                <Icon name="refresh" size={17} />
              </span>
              Actualiser
            </button>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Icon name="search" size={19} />
              <input
                type="search"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher une formation ou un quiz..."
                aria-label="Rechercher une formation ou un quiz"
              />
              {recherche && (
                <button type="button" onClick={() => setRecherche("")} className={styles.clearSearch} aria-label="Effacer la recherche">
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
            <span className={styles.resultCount}>
              {chargement
                ? "Chargement..."
                : `${quizFiltres.length} quiz dans ${formationsAvecQuiz.length} formation(s)`}
            </span>
          </div>

          {chargement ? (
            <div className={styles.loadingGrid}>
              {[1, 2, 3].map((item) => (
                <div key={item} className={styles.skeletonCard}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                  <div className={styles.skeletonLineMedium} />
                </div>
              ))}
            </div>
          ) : quizFiltres.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Icon name="empty" size={34} />
              </div>
              <h3>{recherche ? "Aucun résultat trouvé" : "Aucun quiz pour le moment"}</h3>
              <p>
                {recherche
                  ? "Essayez avec un autre nom de formation ou de quiz."
                  : "Créez un quiz pour l'une de vos formations."}
              </p>
              {recherche ? (
                <button type="button" className={styles.emptyButton} onClick={() => setRecherche("")}>
                  Effacer la recherche
                </button>
              ) : (
                <Link href="/dashboard/formateur/quiz/creer" className={styles.emptyButton}>
                  <Icon name="plus" size={17} />
                  Créer mon premier quiz
                </Link>
              )}
            </div>
          ) : (
            <div className={styles.quizGroups}>
              {formationsAvecQuiz.map((formation, groupIndex) => (
                <section key={formation.key} className={styles.contentSection} style={{ marginBottom: "24px" }}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <div className={styles.moduleTag}>
                        <Icon name="book" size={17} />
                        <span>Formation {formation.numFormation ? `#${formation.numFormation}` : ""}</span>
                      </div>
                      <h2 className={styles.sectionTitle}>{formation.titre}</h2>
                      <p className={styles.sectionSubtitle}>
                        {formation.quizzes.length} quiz{formation.quizzes.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className={styles.quizGrid}>
                    {formation.quizzes.map((item, index) => (
                      <article
                        key={item.codeQuiz || index}
                        className={styles.quizCard}
                        style={{ animationDelay: `${(groupIndex + index) * 60}ms` }}
                      >
                        <div className={styles.quizCardTop}>
                          <div className={styles.quizSymbol}>
                            <Icon name="quiz" size={23} />
                          </div>
                          <span className={styles.quizBadge}>Quiz</span>
                        </div>

                        <div className={styles.quizBody}>
                          <h3 className={styles.quizName}>{item.nomQuiz || "Quiz sans titre"}</h3>
                          <p className={styles.quizDescription}>
                            {item.descriptionQuiz || "Aucune description disponible."}
                          </p>
                          <div className={styles.quizMetrics}>
                            <div className={styles.metric}>
                              <Icon name="clock" size={16} />
                              <span>{item.duree || 0} min</span>
                            </div>
                            <div className={styles.metric}>
                              <Icon name="target" size={16} />
                              <span>{item.seuilReussite ?? 0}% de réussite</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.quizFooter}>
                          <Link
                            href={`/dashboard/formateur/quiz/modifier?id=${encodeURIComponent(item.codeQuiz)}`}
                            className={styles.editButton}
                          >
                            <Icon name="edit" size={16} />
                            Modifier
                          </Link>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            disabled={suppression === item.codeQuiz}
                            onClick={() => setQuizASupprimer(item)}
                          >
                            <Icon name="trash" size={16} />
                            Supprimer
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        {quizASupprimer && (
          <div
            className={styles.modalOverlay}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !suppression) {
                setQuizASupprimer(null);
              }
            }}
          >
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
              <div className={styles.modalIcon}>
                <Icon name="trash" size={25} />
              </div>
              <h2 id="deleteTitle">Supprimer ce quiz ?</h2>
              <p>
                Voulez-vous vraiment supprimer <strong>{quizASupprimer.nomQuiz || "ce quiz"}</strong> ? Cette action peut entraîner la suppression de données associées.
              </p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setQuizASupprimer(null)} disabled={!!suppression}>
                  Annuler
                </button>
                <button type="button" className={styles.confirmDeleteButton} onClick={supprimerQuiz} disabled={!!suppression}>
                  {suppression ? "Suppression..." : "Oui, supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}