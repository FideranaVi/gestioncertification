"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./formation.module.css";
import { obtenirApiFormateur } from "@/lib/api";
const API = obtenirApiFormateur();
const INITIAL_FORM = { titre: "", description: "", dateDebut: "", dateFin: "" };

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}
function getFormations(data) {
  if (Array.isArray(data)) return data;
  return data?.formations || [];
}
function formatDate(date) {
  if (!date) return "Non définie";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Non définie";
  return value.toLocaleDateString("fr-FR");
}
function getToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}
function getNombreApprenants(formation) {
  const valeur = formation.nombreApprenants ?? formation.nombreInscrits ?? formation.totalApprenants ?? formation.totalInscrits ?? formation.nbApprenants ?? formation.nbInscrits ?? formation.countApprenants ?? formation.inscriptionsCount;
  if (valeur !== undefined && valeur !== null && !Number.isNaN(Number(valeur))) return Number(valeur);
  if (Array.isArray(formation.apprenants)) return formation.apprenants.length;
  if (Array.isArray(formation.inscriptions)) return formation.inscriptions.length;
  if (Array.isArray(formation.suivis)) return formation.suivis.length;
  return formation._nbApprenants ?? 0;
}
function getQuizFinal(formation) {
  if (formation.quizFinal && typeof formation.quizFinal === "object") return formation.quizFinal;
  if (Array.isArray(formation.quizzesFinaux) && formation.quizzesFinaux.length > 0) return formation.quizzesFinaux[0];
  if (Array.isArray(formation.quizzes) && formation.quizzes.length > 0) return formation.quizzes.find((q) => q.typeQuiz === "final") || null;
  return null;
}
async function fetchFormations() {
  const token = getToken();
  if (!token) throw new Error("Session expirée. Veuillez vous reconnecter.");
  const res = await fetch(`${API}/formations`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);
  return getFormations(data);
}
// Fallback si le backend n'a pas encore le total : essaie /inscriptions
async function enrichirAvecInscriptions(formations) {
  const token = getToken();
  if (!token) return formations;
  const manque = formations.some((f) => (f.nombreApprenants ?? f.nombreInscrits ?? f.totalApprenants) === undefined || (f.nombreApprenants ?? f.nombreInscrits ?? f.totalApprenants) === null);
  if (!manque) return formations;
  try {
    const res = await fetch(`${API}/inscriptions`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const liste = Array.isArray(data) ? data : data.inscriptions || data.suivis || [];
      if (Array.isArray(liste)) {
        const parFormation = {};
        liste.forEach((ins) => { const id = ins.numFormation ?? ins.formation?.numFormation; if (id != null) parFormation[Number(id)] = (parFormation[Number(id)] || 0) + 1; });
        return formations.map((f) => ({ ...f, _nbApprenants: parFormation[Number(f.numFormation)] ?? 0 }));
      }
    }
  } catch {}
  return formations.map((f) => ({ ...f, _nbApprenants: 0 }));
}

export default function FormationsPage() {
  const [formations, setFormations] = useState([]);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState(false);
  const [formationModifiee, setFormationModifiee] = useState(null);
  const [formulaire, setFormulaire] = useState(INITIAL_FORM);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(null);

  const requete = useCallback(async (url, options = {}) => {
    const token = getToken();
    if (!token) throw new Error("Session expirée. Veuillez vous reconnecter.");
    const res = await fetch(`${API}${url}`, { ...options, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);
    return data;
  }, []);

  const chargerFormations = useCallback(async () => {
    setChargement(true);
    try {
      const resultat = await fetchFormations();
      const enrichies = await enrichirAvecInscriptions(resultat);
      setFormations(enrichies); setErreur("");
    } catch (e) { setErreur(e.message); } finally { setChargement(false); }
  }, []);

  useEffect(() => {
    let actif = true;
    (async () => {
      try {
        const resultat = await fetchFormations();
        const enrichies = await enrichirAvecInscriptions(resultat);
        if (actif) { setFormations(enrichies); setErreur(""); }
      } catch (e) { if (actif) setErreur(e.message); } finally { if (actif) setChargement(false); }
    })();
    return () => { actif = false; };
  }, []);

  const nombreLecons = useCallback((formation) => {
    if (Array.isArray(formation.modules)) return formation.modules.length;
    return Number(formation.nombreModules || 0);
  }, []);

  const formationsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return formations.filter((f) => {
      const okRecherche = !terme || f.titre?.toLowerCase().includes(terme) || f.description?.toLowerCase().includes(terme);
      const nb = nombreLecons(f);
      const okFiltre = filtre === "toutes" || (filtre === "avecLecons" && nb > 0) || (filtre === "sansLecons" && nb === 0);
      return okRecherche && okFiltre;
    });
  }, [formations, recherche, filtre, nombreLecons]);

  const totalLecons = formations.reduce((t, f) => t + nombreLecons(f), 0);
  const totalInscriptions = formations.reduce((t, f) => t + (getNombreApprenants(f) || 0), 0);

  const ouvrirCreation = () => { setFormationModifiee(null); setFormulaire({ ...INITIAL_FORM, dateDebut: getToday() }); setErreur(""); setMessage(""); setModal(true); };
  const ouvrirModification = (formation) => {
    setFormationModifiee(formation);
    setFormulaire({ titre: formation.titre || "", description: formation.description || "", dateDebut: formation.dateDebut ? String(formation.dateDebut).slice(0, 10) : "", dateFin: formation.dateFin ? String(formation.dateFin).slice(0, 10) : "" });
    setErreur(""); setModal(true);
  };
  const fermerModal = () => { if (enregistrement) return; setModal(false); setFormationModifiee(null); setFormulaire(INITIAL_FORM); setErreur(""); };
  const modifierChamp = (e) => { const { name, value } = e.target; setFormulaire((a) => ({ ...a, [name]: value })); };

  const enregistrerFormation = async (e) => {
    e.preventDefault();
    if (!formulaire.titre.trim()) { setErreur("Le nom de la formation est obligatoire."); return; }
    if (!formulaire.dateDebut) { setErreur("La date de début est obligatoire."); return; }
    if (formulaire.dateFin && formulaire.dateFin < formulaire.dateDebut) { setErreur("La date de fin doit être postérieure à la date de début."); return; }
    setEnregistrement(true); setErreur("");
    const donnees = { titre: formulaire.titre.trim(), description: formulaire.description.trim() || null, dateDebut: formulaire.dateDebut, dateFin: formulaire.dateFin || null };
    try {
      const data = formationModifiee ? await requete(`/formations/${formationModifiee.numFormation}`, { method: "PUT", body: JSON.stringify(donnees) }) : await requete("/formations", { method: "POST", body: JSON.stringify(donnees) });
      setMessage(data.message || "Formation enregistrée avec succès."); setModal(false); await chargerFormations();
    } catch (err) { setErreur(err.message); } finally { setEnregistrement(false); }
  };

  const supprimerFormation = async (formation) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${formation.titre}" ?`)) return;
    setSuppression(formation.numFormation); setErreur(""); setMessage("");
    try {
      const data = await requete(`/formations/${formation.numFormation}`, { method: "DELETE" });
      setMessage(data.message || "Formation supprimée avec succès."); await chargerFormations();
    } catch (err) { setErreur(err.message); } finally { setSuppression(null); }
  };

  const lienQuizFinal = (formation) => {
    const quiz = getQuizFinal(formation);
    if (quiz?.codeQuiz) return `/dashboard/formateur/quiz/modifier?codeQuiz=${quiz.codeQuiz}&typeQuiz=final&numFormation=${formation.numFormation}`;
    return `/dashboard/formateur/quiz/creer?numFormation=${formation.numFormation}&typeQuiz=final`;
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/dashboard/formateur" className={styles.backLink}>← Dashboard</Link>
        <span className={styles.topTitle}>Mes formations</span>
        <button type="button" className={styles.topAdd} onClick={ouvrirCreation} aria-label="Créer une formation">+</button>
      </header>

      <section className={styles.hero}>
        <div><span className={styles.eyebrow}>ESPACE FORMATEUR</span><h1>Mes formations</h1><p>Gérez vos formations, suivez les inscriptions des apprenants et préparez les évaluations finales.</p></div>
        <button type="button" className={styles.addButton} onClick={ouvrirCreation}>+ Créer une formation</button>
      </section>

      {message && <div className={styles.success}><span>✓</span>{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}
      {erreur && !modal && <div className={styles.error}>{erreur}<button type="button" onClick={() => setErreur("")}>×</button></div>}

      <section className={styles.statistics}>
        <article className={styles.statCard}><div className={styles.statIcon}>🎓</div><div><span>Total formations</span><strong>{formations.length}</strong></div></article>
        <article className={`${styles.statCard} ${styles.statHighlight}`}><div className={styles.statIcon}>👥</div><div><span>Apprenants inscrits</span><strong>{totalInscriptions}</strong><small>Total toutes formations</small></div></article>
        <article className={styles.statCard}><div className={styles.statIcon}>📚</div><div><span>Total modules</span><strong>{totalLecons}</strong></div></article>
        <article className={styles.statCard}><div className={styles.statIcon}>📝</div><div><span>Avec quiz final</span><strong>{formations.filter((f) => getQuizFinal(f)).length}</strong></div></article>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeader}>
          <div><h2>Bibliothèque de formations</h2><p>Consultez les inscriptions et gérez les évaluations finales.</p></div>
          <button type="button" className={styles.refreshButton} onClick={chargerFormations} disabled={chargement}>↻ Actualiser</button>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}><span>⌕</span><input type="search" placeholder="Rechercher une formation..." value={recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
          <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className={styles.filter}>
            <option value="toutes">Toutes les formations</option>
            <option value="avecLecons">Avec des modules</option>
            <option value="sansLecons">Sans modules</option>
          </select>
        </div>

        {chargement ? (
          <div className={styles.loading}><div className={styles.spinner}></div><p>Chargement des formations...</p></div>
        ) : formationsFiltrees.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📚</div>
            <h3>{recherche || filtre !== "toutes" ? "Aucun résultat trouvé" : "Aucune formation pour le moment"}</h3>
            <p>{recherche || filtre !== "toutes" ? "Essayez de modifier votre recherche ou votre filtre." : "Commencez par créer votre première formation."}</p>
            {!recherche && filtre === "toutes" && <button type="button" onClick={ouvrirCreation} className={styles.addButton}>+ Créer ma première formation</button>}
          </div>
        ) : (
          <div className={styles.grid}>
            {formationsFiltrees.map((formation) => {
              const nombreApprenants = getNombreApprenants(formation);
              const quizFinal = getQuizFinal(formation);
              return (
                <article className={styles.formationCard} key={formation.numFormation}>
                  <div className={styles.cardBanner}>
                    <span className={styles.cardIcon}>🎓</span>
                    <span className={styles.cardBadge}>FORMATION</span>
                    <span className={styles.followersBadge}>👥 {nombreApprenants} inscrit{nombreApprenants > 1 ? "s" : ""}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3>{formation.titre}</h3>
                    <p className={styles.description}>{formation.description || "Aucune description disponible."}</p>
                    <div className={styles.cardStats}>
                      <div className={styles.learnerStat}><span className={styles.learnerIcon}>👥</span><div><strong>{nombreApprenants}</strong><span>Apprenants inscrits</span></div></div>
                      <div className={styles.moduleStat}><span>📚</span><strong>{nombreLecons(formation)}</strong><span>Modules</span></div>
                    </div>
                    <div className={styles.cardDetails}>
                      <div><span>📅</span><span>Début : {formatDate(formation.dateDebut)}</span></div>
                      <div><span>🏁</span><span>Fin : {formatDate(formation.dateFin)}</span></div>
                    </div>
                    <div className={styles.finalQuiz}>
                      <div className={styles.finalQuizInfo}><span className={styles.quizIcon}>📝</span><div><strong>Évaluation finale</strong><span>{quizFinal ? "Un quiz final est déjà associé." : "Aucun quiz final créé."}</span></div></div>
                      <Link href={lienQuizFinal(formation)} className={styles.quizButton}>{quizFinal ? "Modifier le quiz final →" : "+ Créer le quiz final"}</Link>
                    </div>
                    <div className={styles.cardActions}>
                      <button type="button" className={styles.editButton} onClick={() => ouvrirModification(formation)}>✏ Modifier</button>
                      <button type="button" className={styles.deleteButton} onClick={() => supprimerFormation(formation)} disabled={suppression === formation.numFormation}>{suppression === formation.numFormation ? "Suppression..." : "🗑 Supprimer"}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <nav className={styles.bottomNav}>
        <Link href="/dashboard/formateur"><span>🏠</span><small>Dashboard</small></Link>
        <Link href="/dashboard/formateur/formations" className={styles.navActive}><span>🎓</span><small>Formations</small></Link>
        <Link href="/dashboard/formateur/modules"><span>📚</span><small>Modules</small></Link>
        <Link href="/dashboard/formateur/quiz"><span>📝</span><small>Quiz</small></Link>
        <Link href="/dashboard/formateur/tentatives"><span>👀</span><small>Suivi</small></Link>
        <Link href="/dashboard/formateur/certificats"><span>🏆</span><small>Certificats</small></Link>
      </nav>

      {modal && (
        <div className={styles.modalOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) fermerModal(); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modalHeader}>
              <div><span className={styles.eyebrow}>ESPACE FORMATEUR</span><h2 id="modal-title">{formationModifiee ? "Modifier la formation" : "Créer une formation"}</h2><p>Renseignez les informations de votre formation.</p></div>
              <button type="button" className={styles.closeButton} onClick={fermerModal} disabled={enregistrement}>×</button>
            </div>
            {erreur && <div className={styles.error}>{erreur}</div>}
            <form onSubmit={enregistrerFormation} className={styles.form}>
              <div className={styles.field}><label htmlFor="titre">Nom de la formation *</label><input id="titre" name="titre" type="text" placeholder="Exemple : Apprendre Python" value={formulaire.titre} onChange={modifierChamp} maxLength={150} required /></div>
              <div className={styles.field}><label htmlFor="description">Description de la formation</label><textarea id="description" name="description" placeholder="Décrivez les objectifs et le contenu de cette formation..." value={formulaire.description} onChange={modifierChamp} maxLength={255} rows={4} /><small>{formulaire.description.length}/255 caractères</small></div>
              <div className={styles.dateFields}>
                <div className={styles.field}><label htmlFor="dateDebut">Date de début *</label><input id="dateDebut" name="dateDebut" type="date" value={formulaire.dateDebut} onChange={modifierChamp} required /></div>
                <div className={styles.field}><label htmlFor="dateFin">Date de fin</label><input id="dateFin" name="dateFin" type="date" value={formulaire.dateFin} onChange={modifierChamp} min={formulaire.dateDebut || undefined} /></div>
              </div>
              <div className={styles.formInfo}><span>💡</span><p>Après la création, vous pourrez organiser les modules, ajouter les leçons et préparer le quiz final.</p></div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={fermerModal} disabled={enregistrement}>Annuler</button>
                <button type="submit" className={styles.submitButton} disabled={enregistrement}>{enregistrement ? "Enregistrement..." : formationModifiee ? "Enregistrer les modifications" : "Créer la formation"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}