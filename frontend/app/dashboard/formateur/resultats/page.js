"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./resultats.module.css";

const API = "http://localhost:5000/api/formateur";

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

async function apiRequest(endpoint, signal) {
  const token = obtenirToken();
  if (!token) throw new Error("Session expirée");
  const res = await fetch(`${API}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Erreur serveur");
  return data;
}

// ✅ Structure réelle de ton evaluationController
function normaliserEvaluation(e) {
  const tentative = e.tentative || {};
  const apprenant = tentative.apprenant || {};
  const quiz = tentative.quiz || {};

  // ✅ CORRECTION : "module" -> "moduleInfo" (mot réservé Next.js)
  const moduleInfo = quiz.module || {};
  const formation = moduleInfo.formation || {};

  const score = Number(tentative.score ?? e.score ?? e.note ?? 0);
  const seuil = Number(quiz.seuilReussite ?? 10);

  return {
    id: e.codeEvaluation, // ✅ clé unique réelle
    prenom: apprenant.prenom || "",
    nom: apprenant.nom || "",
    email: apprenant.email || "",
    formation: formation.titre || "—",
    numFormation: formation.numFormation,
    quiz: quiz.nomQuiz || "Évaluation finale",
    module: moduleInfo.titreModule || "",
    score,
    noteMax: 20,
    seuil,
    statut: e.resultat || (score >= seuil ? "reussi" : "echoue"), // ✅ e.resultat = "reussi" | "echoue"
    date: e.dateEvaluation,
    numTentative: tentative.codeTentative || tentative.idTentative || 1,
  };
}

export default function ResultatsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [certificats, setCertificats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("toutes");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [tri, setTri] = useState("date-desc");
  const monteRef = useRef(true);

  const charger = useCallback(
    async (signal) => {
      try {
        const [evalData, certData] = await Promise.all([
          apiRequest("/evaluations", signal),
          apiRequest("/certificats", signal).catch(() => []),
        ]);
        if (!monteRef.current) return;
        const listeEval = Array.isArray(evalData) ? evalData : evalData.evaluations || evalData.data || [];
        setEvaluations(listeEval.map(normaliserEvaluation));
        const listeCert = Array.isArray(certData) ? certData : certData.certificats || certData.data || [];
        setCertificats(listeCert);
        setErreur("");
      } catch (e) {
        if (e?.name === "AbortError" || !monteRef.current) return;
        if (e.message === "Session expirée") router.replace("/connexion");
        else setErreur(e.message);
      } finally {
        if (monteRef.current) setChargement(false);
      }
    },
    [router]
  );

  // ✅ CORRECTION ESLINT
  useEffect(() => {
    monteRef.current = true;
    const controller = new AbortController();
    if (!obtenirToken()) {
      router.replace("/connexion");
      return () => controller.abort();
    }
    const timeoutId = setTimeout(() => charger(controller.signal), 0);
    return () => {
      monteRef.current = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [charger, router]);

  const formations = useMemo(
    () => [...new Set(evaluations.map((e) => e.formation).filter((f) => f !== "—"))],
    [evaluations]
  );

  const filtrees = useMemo(() => {
    const liste = evaluations.filter((e) => {
      const okRecherche = `${e.prenom} ${e.nom} ${e.email} ${e.formation} ${e.quiz}`
        .toLowerCase()
        .includes(recherche.toLowerCase());
      const okFormation = filtreFormation === "toutes" || e.formation === filtreFormation;
      const okStatut = filtreStatut === "tous" || e.statut === filtreStatut;
      return okRecherche && okFormation && okStatut;
    });
    return [...liste].sort((a, b) => {
      if (tri === "score-desc") return b.score - a.score;
      if (tri === "score-asc") return a.score - b.score;
      if (tri === "nom-asc") return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }, [evaluations, recherche, filtreFormation, filtreStatut, tri]);

  const moyenne = filtrees.length ? (filtrees.reduce((s, e) => s + e.score, 0) / filtrees.length).toFixed(1) : "0";
  const reussis = filtrees.filter((e) => e.statut === "reussi").length;
  const echoues = filtrees.length - reussis;
  const tauxReussite = filtrees.length ? Math.round((reussis / filtrees.length) * 100) : 0;

  const fermerSession = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    router.replace("/connexion");
  };

  if (chargement)
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.loader}></div>
          <p>Chargement des résultats...</p>
        </div>
      </div>
    );

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>L</div>
          <div>
            <h2>Learning Pro</h2>
            <span>Espace formateur</span>
          </div>
        </div>
        <div className={styles.sidebarLabel}>MENU PRINCIPAL</div>
        <nav className={styles.navigation}>
          <Link href="/dashboard/formateur" className={styles.navLink}>
            <span>▦</span>Tableau de bord
          </Link>
          <Link href="/dashboard/formateur#formations" className={styles.navLink}>
            <span>▤</span>Mes formations
          </Link>
          <Link href="/dashboard/formateur/modules" className={styles.navLink}>
            <span>▣</span>Mes leçons
          </Link>
          <Link href="/dashboard/formateur/quiz" className={styles.navLink}>
            <span>✎</span>Quiz et évaluations
          </Link>
          <Link href="/dashboard/formateur/tentatives" className={styles.navLink}>
            <span>◉</span>Suivi tentatives
          </Link>
          <Link href="/dashboard/formateur/resultats" className={`${styles.navLink} ${styles.active}`}>
            <span>▥</span>Résultats
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.logoutButton} onClick={fermerSession}>
            <span>↪</span>Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarSubtitle}>Espace formateur</span>
            <h1>Résultats des apprenants</h1>
          </div>
          <div className={styles.topbarRight}>
            <Link href="/dashboard/formateur/tentatives" className={styles.secondaryButton}>
              ◉ Suivi en direct
            </Link>
            <Link href="/dashboard/formateur" className={styles.primaryButton}>
              ← Tableau de bord
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          {erreur && (
            <div className={styles.errorMessage}>
              <span>!</span>
              {erreur}
            </div>
          )}

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>▥</div>
              <div>
                <span>Évaluations passées</span>
                <strong>{filtrees.length}</strong>
                <small>Tentatives terminées</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>★</div>
              <div>
                <span>Moyenne</span>
                <strong>{moyenne} / 20</strong>
                <small>Sur les résultats filtrés</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>✓</div>
              <div>
                <span>Réussites</span>
                <strong>{reussis}</strong>
                <small>{tauxReussite}% de réussite</small>
              </div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.purpleIcon}`}>🎓</div>
              <div>
                <span>Certificats délivrés</span>
                <strong>{certificats.length}</strong>
                <small>{echoues} échec(s)</small>
              </div>
            </article>
          </section>

          <section className={styles.tableSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>TABLEAU DES RÉSULTATS</span>
                <h2>Tous les résultats</h2>
              </div>
              <span className={styles.countBadge}>{filtrees.length} résultat(s)</span>
            </div>

            <div className={styles.listToolbar}>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Rechercher un apprenant, email, formation..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
              <select value={filtreFormation} onChange={(e) => setFiltreFormation(e.target.value)} className={styles.select}>
                <option value="toutes">Toutes les formations</option>
                {formations.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className={styles.select}>
                <option value="tous">Tous les statuts</option>
                <option value="reussi">Réussis</option>
                <option value="echoue">Échoués</option>
              </select>
              <select value={tri} onChange={(e) => setTri(e.target.value)} className={styles.select}>
                <option value="date-desc">Plus récents d&apos;abord</option>
                <option value="score-desc">Meilleur score d&apos;abord</option>
                <option value="score-asc">Plus petit score d&apos;abord</option>
                <option value="nom-asc">Nom A → Z</option>
              </select>
            </div>

            {filtrees.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>▥</div>
                <h3>Aucun résultat</h3>
                <p>Aucun apprenant n&apos;a encore passé d&apos;évaluation.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Apprenant</th>
                      <th>Formation</th>
                      <th>Évaluation</th>
                      <th>Tentative</th>
                      <th>Date</th>
                      <th>Score</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrees.map((e) => {
                      const reussi = e.statut === "reussi";
                      const pourcentage = Math.round((e.score / e.noteMax) * 100);
                      return (
                        <tr key={e.id}>
                          <td>
                            <div className={styles.apprenantCell}>
                              <div className={styles.avatar}>{String(e.prenom || e.nom || "?").charAt(0).toUpperCase()}</div>
                              <div>
                                <strong>
                                  {e.prenom} {e.nom}
                                </strong>
                                <span>{e.email || "—"}</span>
                              </div>
                            </div>
                          </td>
                          <td>{e.formation}</td>
                          <td>{e.quiz}</td>
                          <td>
                            <span className={styles.tentativeBadge}>#{e.numTentative}</span>
                          </td>
                          <td>{e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "—"}</td>
                          <td>
                            <div className={styles.scoreCell}>
                              <strong>
                                {e.score} / {e.noteMax}
                              </strong>
                              <div className={styles.miniProgress}>
                                <div className={reussi ? styles.miniProgressOk : styles.miniProgressKo} style={{ width: `${pourcentage}%` }} />
                              </div>
                              <small>{pourcentage}%</small>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${reussi ? styles.statusReady : styles.statusPending}`}>
                              {reussi ? "✓ Réussi" : "✕ Échoué"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}