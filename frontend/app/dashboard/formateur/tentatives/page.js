"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./tentatives.module.css";
import { obtenirApiFormateur } from "@/lib/api";

const API = obtenirApiFormateur() + "/tentatives";
const ACTUALISATION_MS = 5000;
const DELAI_HORS_LIGNE_MS = 30000;

function obtenirToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
}

function dateLisible(date) {
  if (!date) return "Non disponible";
  const v = new Date(date);
  return Number.isNaN(v.getTime()) ? "Non disponible" : v.toLocaleString("fr-FR");
}

function dureeLisible(sec) {
  const total = Math.max(0, Number(sec || 0));
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

function nomApprenant(t) {
  const a = t.apprenant;
  if (!a) return `Apprenant #${t.idApprenant || "?"}`;
  const nom = String(a.nom || "").trim().toUpperCase();
  let prenom = String(a.prenom || "").trim();
  if (prenom) prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
  return [nom, prenom].filter(Boolean).join(" ") || `Apprenant #${t.idApprenant}`;
}

function obtenirScore(t) {
  if (t.evaluation?.score != null) return Number(t.evaluation.score);
  if (t.score != null) return Number(t.score);
  return null;
}

function typeActiviteTexte(type) {
  const map = {
    sortie_onglet: "Sortie de l'onglet",
    sortie_fenetre: "Sortie de la fenêtre",
    page_quittee: "Page quittée",
    retour: "Retour sur la page",
  };
  return map[type] || type || "Activité";
}

function derniereActiviteMs(t) {
  const d = new Date(t.derniereActivite || t.dateTentative || 0).getTime();
  return Number.isNaN(d) ? 0 : d;
}

function estSortie(type) {
  return ["sortie_onglet", "sortie_fenetre", "page_quittee", "sortie", "hors_ecran", "hidden", "blur"].includes(String(type || "").toLowerCase());
}

function derniereActiviteJournal(t) {
  const acts = Array.isArray(t.activites) ? t.activites : [];
  if (!acts.length) return null;
  return acts[acts.length - 1];
}

function statutTentative(t, maintenant) {
  const base = String(t.statut || "").toLowerCase();
  if (base === "terminee" || base === "terminée") return "terminee";
  if (base === "abandonnee" || base === "abandonnée") return "abandonnee";
  if (base !== "en_cours") return "hors_ligne";

  const age = maintenant - derniereActiviteMs(t);
  const derniere = derniereActiviteJournal(t);

  if (derniere && estSortie(derniere.type)) return "hors_ecran";
  if (t.horsEcran === true) return "hors_ecran";
  if (age > DELAI_HORS_LIGNE_MS) return "hors_ligne";
  return "en_cours";
}

function statutTexte(s) {
  if (s === "terminee") return "Terminée";
  if (s === "hors_ecran") return "Hors écran";
  if (s === "hors_ligne") return "Hors ligne";
  if (s === "abandonnee") return "Abandonnée";
  return "En cours";
}

function classeStatut(s) {
  if (s === "terminee") return styles.terminee;
  if (s === "hors_ecran") return styles.hors_ecran;
  if (s === "hors_ligne") return styles.signal_inactif || styles.hors_ecran;
  if (s === "abandonnee") return styles.abandonnee;
  return styles.en_cours;
}

export default function TentativesFormateurPage() {
  const router = useRouter();
  const [tentatives, setTentatives] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [formationSelectionnee, setFormationSelectionnee] = useState("toutes");
  const [detailsOuverts, setDetailsOuverts] = useState({});
  const [actualisation, setActualisation] = useState(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [validationsEnCours, setValidationsEnCours] = useState({});
  const [messagesValidation, setMessagesValidation] = useState({});
  const requeteEnCours = useRef(false);
  const pageActive = useRef(true);

  const chargerTentatives = useCallback(async (force) => {
    if (requeteEnCours.current && !force) return null;
    requeteEnCours.current = true;
    const token = obtenirToken();
    if (!token) { requeteEnCours.current = false; router.push("/connexion"); return null; }
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!pageActive.current) return null;
      if (res.status === 401 || res.status === 403) { router.push("/connexion"); return null; }
      if (!res.ok) throw new Error(data.message || "Impossible de récupérer les tentatives.");
      const liste = Array.isArray(data.tentatives) ? data.tentatives : [];
      setTentatives(liste); setErreur(""); setActualisation(new Date());
      return liste;
    } catch (e) {
      if (pageActive.current) setErreur(e.message || "Erreur de récupération.");
      return null;
    } finally {
      requeteEnCours.current = false;
      if (pageActive.current) setChargement(false);
    }
  }, [router]);

  useEffect(() => {
    pageActive.current = true;
    chargerTentatives(true);
    const poll = setInterval(() => chargerTentatives(false), ACTUALISATION_MS);
    const horloge = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => { pageActive.current = false; clearInterval(poll); clearInterval(horloge); };
  }, [chargerTentatives]);

  const formations = useMemo(() => {
    const map = new Map();
    tentatives.forEach((t) => { if (t.formation?.numFormation) map.set(Number(t.formation.numFormation), t.formation.titre || "Formation sans titre"); });
    return Array.from(map.entries()).map(([id, titre]) => ({ id: String(id), titre }));
  }, [tentatives]);

  const stats = useMemo(() => {
    const compte = (s) => tentatives.filter((t) => statutTentative(t, maintenant) === s).length;
    return {
      total: tentatives.length,
      enCours: compte("en_cours"),
      horsEcran: compte("hors_ecran"),
      horsLigne: compte("hors_ligne"),
      terminees: compte("terminee"),
      abandonnees: compte("abandonnee"),
      sorties: tentatives.reduce((a, t) => a + Number(t.nbSorties || 0), 0),
    };
  }, [tentatives, maintenant]);

  const filtrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return tentatives.filter((t) => {
      if (filtre !== "toutes") {
        if (filtre === "avec_sorties") { if (Number(t.nbSorties || 0) <= 0) return false; }
        else if (statutTentative(t, maintenant) !== filtre) return false;
      }
      if (formationSelectionnee !== "toutes" && Number(t.formation?.numFormation) !== Number(formationSelectionnee)) return false;
      if (!terme) return true;
      const textes = [nomApprenant(t), t.apprenant?.email, t.quiz?.nomQuiz, t.formation?.titre, t.statut];
      return textes.some((x) => String(x || "").toLowerCase().includes(terme));
    });
  }, [tentatives, recherche, filtre, formationSelectionnee, maintenant]);

  const validerCertificat = async (tentative, decision) => {
    const id = tentative.idTentative;
    if (!id || validationsEnCours[id]) return;
    const token = obtenirToken();
    if (!token) { router.push("/connexion"); return; }
    if (!window.confirm(decision === "valider" ? "Valider le certificat de cet apprenant ?" : "Refuser le certificat de cet apprenant ?")) return;
    setValidationsEnCours((p) => ({ ...p, [id]: true }));
    setMessagesValidation((p) => ({ ...p, [id]: "" }));
    try {
      const res = await fetch(`${API}/${id}/certificat`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) { router.push("/connexion"); return; }
      if (!res.ok) throw new Error(data.message || "Impossible de traiter le certificat.");
      await chargerTentatives(true);
      setMessagesValidation((p) => ({ ...p, [id]: data.message || (decision === "valider" ? "Certificat validé." : "Certificat refusé.") }));
    } catch (e) {
      await chargerTentatives(true);
      setMessagesValidation((p) => ({ ...p, [id]: e.message }));
    } finally {
      setValidationsEnCours((p) => ({ ...p, [id]: false }));
    }
  };

  const toggleDetails = (id) => setDetailsOuverts((p) => ({ ...p, [id]: !p[id] }));
  const recharger = () => { setChargement(true); chargerTentatives(true); };

  if (chargement && tentatives.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.chargement}>
          <div className={styles.spinner}></div>
          <p>Chargement des tentatives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/dashboard/formateur" className={styles.retour}>← Dashboard</Link>
          <span className={styles.eyebrow}>ESPACE FORMATEUR</span>
          <h1>Suivi des tentatives</h1>
          <p className={styles.sousTitre}>Qui fait le quiz en ce moment, qui est hors écran, qui a changé d&apos;onglet.</p>
        </div>
        <button type="button" className={styles.boutonActualiser} onClick={recharger} disabled={chargement}>
          ↻ {chargement ? "Actualisation..." : "Actualiser"}
        </button>
      </header>

      {erreur && (
        <div className={styles.erreur}>
          <strong>Erreur :</strong> {erreur}
          <button type="button" onClick={recharger}>Réessayer</button>
        </div>
      )}

      <div className={styles.statistiques}>
        <div className={styles.statCard}><span className={styles.statLabel}>Total</span><strong>{stats.total}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>En cours</span><strong className={styles.statEnCours}>{stats.enCours}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Hors écran</span><strong className={styles.statHorsEcran}>{stats.horsEcran}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Hors ligne</span><strong>{stats.horsLigne}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Terminées</span><strong className={styles.statTerminees}>{stats.terminees}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Abandonnées</span><strong className={styles.abandonnees}>{stats.abandonnees}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Sorties</span><strong className={styles.statSorties}>{stats.sorties}</strong></div>
      </div>

      <section className={styles.filtres}>
        <div className={styles.filtreRecherche}>
          <label htmlFor="recherche">Rechercher</label>
          <input id="recherche" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Apprenant, quiz, formation..." />
        </div>
        <div className={styles.filtreFormation}>
          <label htmlFor="formation">Formation</label>
          <select id="formation" value={formationSelectionnee} onChange={(e) => setFormationSelectionnee(e.target.value)}>
            <option value="toutes">Toutes les formations</option>
            {formations.map((f) => <option key={f.id} value={f.id}>{f.titre}</option>)}
          </select>
        </div>
      </section>

      <nav className={styles.filtresStatut}>
        {[["toutes", "Toutes"], ["en_cours", "En cours"], ["hors_ecran", "Hors écran"], ["hors_ligne", "Hors ligne"], ["terminee", "Terminées"], ["abandonnee", "Abandonnées"], ["avec_sorties", "Avec sorties"]].map(([value, label]) => (
          <button key={value} type="button" className={filtre === value ? styles.filtreActif : styles.filtreBouton} onClick={() => setFiltre(value)}>{label}</button>
        ))}
      </nav>

      <div className={styles.infoActualisation}>
        <span className={styles.pointLive}></span>
        Actualisation automatique toutes les 5 secondes
        {actualisation && <span className={styles.dateActualisation}>Dernière mise à jour : {dateLisible(actualisation)}</span>}
      </div>

      <section className={styles.liste}>
        {filtrees.length === 0 ? (
          <div className={styles.vide}>
            <h3>Aucune tentative trouvée</h3>
            <p>{filtre === "en_cours" ? "Personne ne fait le quiz en ce moment." : "Les tentatives des apprenants apparaîtront ici dès qu'ils commenceront un quiz."}</p>
          </div>
        ) : filtrees.map((t) => {
          const id = t.idTentative;
          const statut = statutTentative(t, maintenant);
          const score = obtenirScore(t);
          const resultat = String(t.evaluation?.resultat || t.resultat || "").toLowerCase();
          const reussie = ["reussi", "réussi", "reussie", "réussie"].includes(resultat);
          const cert = t.certificat || {};
          const certStatut = String(cert.statutCertificat || cert.statut || t.statutCertificat || "").toLowerCase();
          const certValide = ["valide", "validé", "validee", "validée"].includes(certStatut);
          const certRefuse = ["refuse", "refusé", "refusee", "refusée"].includes(certStatut);
          const ouvert = Boolean(detailsOuverts[id]);
          const activites = Array.isArray(t.activites) ? t.activites : [];
          const nbQuestions = Number(t.nbQuestions || 0);
          const nbReponses = Number(t.nbReponses || 0);
          const progression = Math.max(0, Math.min(100, Number(t.progression || 0)));
          const sorties = Number(t.nbSorties || 0);
          const tempsHorsEcran = Number(t.tempsHorsEcran || 0);

          return (
            <article className={styles.tentativeCard} key={id}>
              <div className={styles.cardHeader}>
                <div className={styles.identite}>
                  <div className={styles.avatar}>{nomApprenant(t).slice(0, 1).toUpperCase()}</div>
                  <div>
                    <h3>{nomApprenant(t)} {statut === "en_cours" && <span className={styles.dotEnLigne}>● En ligne</span>}</h3>
                    <p>{t.apprenant?.email || `ID apprenant : ${t.idApprenant}`}</p>
                  </div>
                </div>
                <span className={`${styles.statut} ${classeStatut(statut)}`}>{statutTexte(statut)}</span>
              </div>

              {statut === "hors_ecran" && (
                <div className={styles.alerteSorties}>
                  <strong>⚠ Hors écran / Changement d&apos;onglet</strong>
                  <span>Le dernier événement = sortie. Pas de retour. Sorties : {sorties} · Temps hors écran : {dureeLisible(tempsHorsEcran)}</span>
                </div>
              )}
              {statut === "hors_ligne" && (
                <div className={styles.alerteSorties}>
                  <strong>Hors ligne</strong>
                  <span>Plus de 30 secondes sans activité. Dernière activité : {dateLisible(t.derniereActivite)}</span>
                </div>
              )}

              <div className={styles.infosQuiz}>
                <div><span className={styles.label}>Quiz</span><strong>{t.quiz?.nomQuiz || "Quiz"}</strong></div>
                <div><span className={styles.label}>Formation</span><strong>{t.formation?.titre || "Formation non identifiée"}</strong></div>
                <div><span className={styles.label}>Module</span><strong>{t.moduleInfo?.titreModule || (t.quiz?.typeQuiz === "final" ? "Quiz final" : "Non précisé")}</strong></div>
                <div><span className={styles.label}>Début</span><strong>{dateLisible(t.dateTentative)}</strong></div>
              </div>

              <div className={styles.progressionSection}>
                <div className={styles.progressionEntete}><span>Progression des réponses</span><strong>{nbReponses} / {nbQuestions}</strong></div>
                <div className={styles.progressionBarre}><div className={styles.progressionValeur} style={{ width: `${progression}%` }}></div></div>
                <span className={styles.progressionPourcentage}>{progression} %</span>
              </div>

              <div className={styles.resume}>
                <div className={styles.resumeItem}><span>Sorties</span><strong>{sorties}</strong></div>
                <div className={styles.resumeItem}><span>Temps hors écran</span><strong>{dureeLisible(tempsHorsEcran)}</strong></div>
                <div className={styles.resumeItem}><span>Score</span><strong>{score !== null ? `${score} %` : "En attente"}</strong></div>
                <div className={styles.resumeItem}><span>Résultat</span><strong>{reussie ? "Réussi" : resultat === "echoue" || resultat === "échoué" ? "Échoué" : "En attente"}</strong></div>
              </div>

              {statut === "terminee" && reussie && (
                <div className={styles.validationCertificat}>
                  <div className={styles.validationEntete}>
                    <div><strong>Validation du certificat</strong><p>L&apos;apprenant a réussi.{score !== null ? ` Score : ${score} %.` : ""}</p></div>
                    {certValide && <span className={styles.certificatValide}>✓ Certificat validé</span>}
                    {certRefuse && <span className={styles.certificatRefuse}>Certificat refusé</span>}
                    {!certValide && !certRefuse && <span className={styles.certificatAttente}>En attente de validation</span>}
                  </div>
                  {!certValide && !certRefuse && (
                    <div className={styles.actionsCertificat}>
                      <button type="button" className={styles.boutonValiderCertificat} onClick={() => validerCertificat(t, "valider")} disabled={Boolean(validationsEnCours[id])}>{validationsEnCours[id] ? "Traitement..." : "✓ Valider le certificat"}</button>
                      <button type="button" className={styles.boutonRefuserCertificat} onClick={() => validerCertificat(t, "refuser")} disabled={Boolean(validationsEnCours[id])}>Refuser</button>
                    </div>
                  )}
                  {messagesValidation[id] && <p className={styles.messageValidation}>{messagesValidation[id]}</p>}
                </div>
              )}

              {sorties > 0 && (
                <div className={styles.alerteSorties}>
                  <strong>{sorties} sortie(s) enregistrée(s)</strong>
                  <span>Les changements d&apos;onglet ou de fenêtre figurent dans l&apos;historique.</span>
                </div>
              )}

              <button type="button" className={styles.boutonDetails} onClick={() => toggleDetails(id)} aria-expanded={ouvert}>{ouvert ? "Masquer les activités ▲" : "Voir les activités ▼"}</button>

              {ouvert && (
                <div className={styles.details}>
                  <h4>Historique des activités</h4>
                  {activites.length === 0 ? (
                    <p className={styles.aucuneActivite}>Aucune activité de surveillance enregistrée.</p>
                  ) : (
                    <div className={styles.timeline}>
                      {activites.map((a, i) => (
                        <div className={styles.activite} key={a.idActivite || i}>
                          <div className={a.type === "retour" ? styles.pointRetour : styles.pointSortie}></div>
                          <div className={styles.activiteContenu}>
                            <strong>{typeActiviteTexte(a.type)}</strong>
                            <span>{dateLisible(a.dateActivite)}</span>
                            {a.dureeSecondes != null && <span>Durée : {dureeLisible(a.dureeSecondes)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.detailsInformations}>
                    <p><strong>ID tentative :</strong> {id}</p>
                    <p><strong>ID quiz :</strong> {t.codeQuiz}</p>
                    <p><strong>Dernière activité :</strong> {dateLisible(t.derniereActivite)}</p>
                    <p><strong>Statut en base :</strong> {t.statut || "Non précisé"}</p>
                    <p><strong>État interprété :</strong> {statutTexte(statut)}</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}