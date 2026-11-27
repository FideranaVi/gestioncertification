"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Star,
  CheckCircle2,
  GraduationCap,
  Search,
  LogOut,
  ArrowLeft,
  Trophy,
  XCircle,
} from "lucide-react";
import styles from "./resultats.module.css";
import { obtenirApiFormateur } from "@/lib/api";

const API = obtenirApiFormateur();

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

const pick = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

export default function ResultatsPage() {
  const router = useRouter();
  const [lignes, setLignes] = useState([]);
  const [certificats, setCertificats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreFormation, setFiltreFormation] = useState("toutes");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [tri, setTri] = useState("date-desc");

  const normaliserLigne = (raw, type) => {
    // raw peut être une tentative OU une évaluation
    const t = raw.tentative || raw.Tentative || raw;
    const apprenantObj = t.apprenant || t.Apprenant || t.utilisateur || t.Utilisateur || raw.apprenant || {};
    const quizObj = t.quiz || t.Quiz || raw.quiz || {};
    const moduleObj = quizObj.module || quizObj.Module || {};
    const formationObj = moduleObj.formation || moduleObj.Formation || t.formation || t.Formation || raw.formation || {};

    const nom = pick(apprenantObj.nom, apprenantObj.NOM, raw.nom, raw.nomApprenant, t.nom);
    const prenom = pick(apprenantObj.prenom, apprenantObj.Prenom, raw.prenom, raw.prenomApprenant, t.prenom);
    const email = pick(apprenantObj.email, apprenantObj.mail, raw.email, raw.emailApprenant);

    const formation = pick(formationObj.titre, formationObj.titreFormation, formationObj.nomFormation, t.titreFormation, raw.titreFormation, t.nomFormation) || "Formation";
    const quiz = pick(quizObj.nomQuiz, quizObj.titre, quizObj.nom, t.nomQuiz, t.titreQuiz, t.codeQuiz, t.code_quiz, raw.nomQuiz) || "Quiz";
    const moduleTitre = pick(moduleObj.titreModule, moduleObj.titre, t.titreModule) || "";

    const scoreRaw = pick(t.score, t.note, raw.score, raw.note, raw.evaluation?.score, t.evaluation?.score);
    const score = scoreRaw === null ? null : Number(scoreRaw);
    const scoreOk = score !== null && !Number.isNaN(score);

    // Score peut être /20 ou /100 -> on normalise en /20 pour l'affichage
    let score20 = scoreOk ? score : 0;
    if (scoreOk && score > 20) score20 = Math.round((score / 100) * 20 * 10) / 10;

    const resultatBrut = String(pick(raw.resultat, raw.evaluation?.resultat, t.resultat, t.statut, raw.statut) || "").toLowerCase();
    const reussie = ["reussi", "réussi", "reussie", "réussie", "success", "passed", "valide"].includes(resultatBrut) || (scoreOk && score20 >= 10);
    const echouee = ["echoue", "échoué", "echec", "échec", "failed"].includes(resultatBrut) || (scoreOk && score20 < 10);

    return {
      id: pick(raw.codeEvaluation, raw.idEvaluation, t.idTentative, t.id, raw.id, raw.codeTentative) || `${type}-${Math.random()}`,
      prenom: prenom ? String(prenom).charAt(0).toUpperCase() + String(prenom).slice(1).toLowerCase() : "",
      nom: nom ? String(nom).toUpperCase() : "Apprenant",
      email: email || "",
      formation: String(formation),
      quiz: String(quiz),
      module: String(moduleTitre),
      score: score20,
      scoreBrut: score,
      noteMax: 20,
      statut: reussie ? "reussi" : echouee ? "echoue" : "en_cours",
      date: pick(raw.dateEvaluation, raw.dateCreation, t.dateTentative, t.dateCreation, t.createdAt, t.derniereActivite, raw.createdAt),
      numTentative: pick(t.codeTentative, t.idTentative, t.id, raw.codeTentative) || 1,
      nbSorties: pick(t.nbSortiesEcran, t.nbSorties, t.sorties) ?? 0,
    };
  };

  const charger = async () => {
    const token = obtenirToken();
    if (!token) throw new Error("Session expirée");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchSafe = async (endpoint) => {
      try {
        const res = await fetch(`${API}${endpoint}`, { headers, cache: "no-store" });
        const data = await res.json().catch(() => []);
        if (!res.ok) return [];
        if (Array.isArray(data)) return data;
        return data.evaluations || data.tentatives || data.certificats || data.data || data.rows || [];
      } catch {
        return [];
      }
    };

    const [tentatives, evaluations, certs] = await Promise.all([
      fetchSafe("/tentatives"),
      fetchSafe("/evaluations"),
      fetchSafe("/certificats"),
    ]);

    // On prend TOUT : tentatives d'abord, puis évaluations non déjà vues
    const lignesFusion = [];
    const vus = new Set();

    tentatives.forEach((t) => {
      const ligne = normaliserLigne(t, "tent");
      const cle = String(pick(t.idTentative, t.id, t.codeTentative) || ligne.id);
      if (vus.has(cle)) return;
      vus.add(cle);
      lignesFusion.push(ligne);
    });

    evaluations.forEach((e) => {
      const ligne = normaliserLigne(e, "eval");
      const cle = String(pick(e.codeEvaluation, e.idEvaluation, e.tentative?.idTentative, e.id) || ligne.id);
      // Si cette tentative est déjà là, on ne double pas
      const idTent = e.tentative?.idTentative || e.idTentative;
      if (idTent && vus.has(String(idTent))) return;
      if (vus.has(cle)) return;
      vus.add(cle);
      lignesFusion.push(ligne);
    });

    return { lignes: lignesFusion, certs };
  };

  useEffect(() => {
    let actif = true;
    if (!obtenirToken()) {
      router.replace("/connexion");
      return;
    }
    charger()
      .then(({ lignes: liste, certs }) => {
        if (!actif) return;
        setLignes(liste);
        setCertificats(certs);
        setChargement(false);
      })
      .catch((e) => {
        if (!actif) return;
        if (e.message === "Session expirée") router.replace("/connexion");
        else setErreur(e.message);
        setChargement(false);
      });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formations = useMemo(
    () => [...new Set(lignes.map((e) => e.formation).filter(Boolean))].sort(),
    [lignes]
  );

  const filtrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    const liste = lignes.filter((e) => {
      if (terme) {
        const hay = `${e.prenom} ${e.nom} ${e.email} ${e.formation} ${e.quiz} ${e.module}`.toLowerCase();
        if (!hay.includes(terme)) return false;
      }
      if (filtreFormation !== "toutes" && e.formation !== filtreFormation) return false;
      if (filtreStatut !== "tous" && e.statut !== filtreStatut) return false;
      return true;
    });
    return [...liste].sort((a, b) => {
      if (tri === "score-desc") return b.score - a.score;
      if (tri === "score-asc") return a.score - b.score;
      if (tri === "nom-asc") return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }, [lignes, recherche, filtreFormation, filtreStatut, tri]);

  const moyenne = filtrees.length ? (filtrees.reduce((s, e) => s + e.score, 0) / filtrees.length).toFixed(1) : "0.0";
  const reussis = filtrees.filter((e) => e.statut === "reussi").length;
  const echoues = filtrees.filter((e) => e.statut === "echoue").length;
  const tauxReussite = filtrees.length ? Math.round((reussis / filtrees.length) * 100) : 0;

  const fermerSession = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    router.replace("/connexion");
  };

  const recharger = () => {
    setChargement(true);
    setErreur("");
    charger()
      .then(({ lignes: liste, certs }) => {
        setLignes(liste);
        setCertificats(certs);
        setChargement(false);
      })
      .catch((e) => {
        setErreur(e.message);
        setChargement(false);
      });
  };

  if (chargement) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.loader}></div>
          <p>Chargement des résultats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>L</div>
          <div><h2>Learning Pro</h2><span>Espace formateur</span></div>
        </div>
        <div className={styles.sidebarLabel}>MENU PRINCIPAL</div>
        <nav className={styles.navigation}>
          <Link href="/dashboard/formateur/resultats" className={`${styles.navLink} ${styles.active}`}>
            <BarChart3 size={19} /> Résultats
          </Link>
        </nav>
        <div className={styles.sidebarReturn}>
          <Link href="/dashboard/formateur" className={styles.returnButton}>
            <ArrowLeft size={18} /> Retour au tableau de bord
          </Link>
          <p>Retourne à ton espace principal formateur pour gérer formations, modules et quiz.</p>
        </div>
        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.logoutButton} onClick={fermerSession}>
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarSubtitle}>Espace formateur • Résultats</span>
            <h1>Résultats des apprenants</h1>
          </div>
          <div className={styles.topbarRight}>
            <button type="button" className={styles.primaryButton} onClick={recharger}>Actualiser</button>
            <Link href="/dashboard/formateur" className={styles.primaryButton}>
              <ArrowLeft size={18} /> Tableau de bord
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          {erreur && (
            <div className={styles.errorMessage}>
              <XCircle size={18} /> {erreur}
            </div>
          )}

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}><BarChart3 size={22} /></div>
              <div><span>Évaluations passées</span><strong>{filtrees.length}</strong><small>Tentatives terminées</small></div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}><Star size={22} /></div>
              <div><span>Moyenne</span><strong>{moyenne} / 20</strong><small>Sur les résultats filtrés</small></div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}><CheckCircle2 size={22} /></div>
              <div><span>Réussites</span><strong>{reussis}</strong><small>{tauxReussite}% de réussite</small></div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.purpleIcon}`}><GraduationCap size={22} /></div>
              <div><span>Certificats délivrés</span><strong>{certificats.length}</strong><small>{echoues} échec(s)</small></div>
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
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Rechercher un apprenant, email, formation..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
              </div>
              <select value={filtreFormation} onChange={(e) => setFiltreFormation(e.target.value)} className={styles.select}>
                <option value="toutes">Toutes les formations</option>
                {formations.map((f) => (
                  <option key={f} value={f}>{f}</option>
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

            {/* TABLEAU TOUJOURS AFFICHÉ */}
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
                  {filtrees.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "#65676b" }}>
                      Aucun résultat pour cette recherche / ce filtre. Essaie de vider la recherche ou de mettre &quot;Toutes les formations&quot;.
                    </td></tr>
                  ) : (
                    filtrees.map((e) => {
                      const reussi = e.statut === "reussi";
                      const pourcentage = Math.max(0, Math.min(100, Math.round((e.score / e.noteMax) * 100)));
                      return (
                        <tr key={e.id}>
                          <td>
                            <div className={styles.apprenantCell}>
                              <div className={styles.avatar}>{String(e.prenom || e.nom || "?").charAt(0).toUpperCase()}</div>
                              <div><strong>{e.prenom} {e.nom}</strong><span>{e.email || "—"}</span></div>
                            </div>
                          </td>
                          <td>{e.formation}</td>
                          <td>{e.quiz}</td>
                          <td><span className={styles.tentativeBadge}>#{e.numTentative}</span></td>
                          <td>{e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "—"}</td>
                          <td>
                            <div className={styles.scoreCell}>
                              <strong>{e.score} / {e.noteMax}</strong>
                              <div className={styles.miniProgress}>
                                <div className={reussi ? styles.miniProgressOk : styles.miniProgressKo} style={{ width: `${pourcentage}%` }} />
                              </div>
                              <small>{pourcentage}%</small>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${reussi ? styles.statusReady : styles.statusPending}`}>
                              {reussi ? <><CheckCircle2 size={14} /> Réussi</> : <><XCircle size={14} /> Échoué</>}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}