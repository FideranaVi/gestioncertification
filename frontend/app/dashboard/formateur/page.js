"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  FileText,
  CheckCircle2,
  Trophy,
  BarChart3,
  GraduationCap,
  ArrowRight,
  User,
  Mail,
  LogOut,
  Camera,
  X,
  Plus,
  Clock,
  Eye,
  Award,
  Search,
} from "lucide-react";
import styles from "./formateur.module.css";

function obtenirBaseApi() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const nettoye = String(base).replace(/\/$/, "");
  if (nettoye.endsWith("/api")) return `${nettoye}/formateur`;
  return `${nettoye}/api/formateur`;
}
const API = obtenirBaseApi();
const INTERVALLE_TENTATIVES = 5000;
const DELAI_HORS_LIGNE = 30000;

const formationInitiale = { titre: "", description: "", dateDebut: "", dateFin: "" };

class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

async function apiRequest(endpoint, options = {}) {
  const token = obtenirToken();
  if (!token) throw new ApiError("Votre session a expiré.", 401);
  let response;
  try {
    response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
  } catch {
    throw new ApiError("Impossible de contacter le serveur. Vérifiez le backend.");
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) throw new ApiError(data.message || "Accès refusé. Veuillez vous reconnecter.", response.status);
  if (!response.ok) throw new ApiError(data.message || "Une erreur est survenue.", response.status);
  return data;
}

function extraireListe(data, propriete) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[propriete])) return data[propriete];
  return [];
}

async function recupererDonnees(signal) {
  const [formationsData, modulesData] = await Promise.all([
    apiRequest("/formations", { signal }),
    apiRequest("/modules", { signal }),
  ]);
  return { formations: extraireListe(formationsData, "formations"), modules: extraireListe(modulesData, "modules") };
}

function obtenirUtilisateurDepuisToken() {
  try {
    const token = obtenirToken();
    if (!token) return null;
    const partie = token.split(".")[1];
    if (!partie) return null;
    const base64 = partie.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
  } catch { return null; }
}

function normaliserUtilisateur(brut) {
  if (!brut) return null;
  const u = brut.utilisateur || brut.formateur || brut.user || brut.data || brut;
  if (!u || typeof u !== "object") return null;
  const prenom = u.prenom || u.firstName || "";
  const nom = u.nom || u.lastName || u.name || "";
  const nomCompletBrut = u.nomComplet || u.nom_complet || u.fullName || u.displayName || "";
  let nomComplet = "";
  if (nomCompletBrut?.trim()) nomComplet = nomCompletBrut.trim();
  else if (prenom || nom) nomComplet = `${prenom} ${nom}`.trim();
  return {
    ...u, prenom, nom, nomComplet,
    email: u.email || u.mail || "",
    photo: u.photo || u.photoProfil || u.picture || u.avatar || "",
    picture: u.photo || u.photoProfil || u.picture || u.avatar || "",
    username: u.username || u.pseudo || "",
    role: u.role || "formateur",
  };
}

async function recupererProfilFormateur(signal) {
  for (const ep of ["/profil", "/me", "/profile"]) {
    try {
      const data = await apiRequest(ep, { signal });
      const n = normaliserUtilisateur(data);
      if (n && (n.nomComplet || n.email)) return n;
    } catch (e) { if (e?.status === 401 || e?.status === 403) throw e; continue; }
  }
  try {
    const sauve = localStorage.getItem("utilisateur") || localStorage.getItem("user");
    if (sauve) {
      const n = normaliserUtilisateur(JSON.parse(sauve));
      if (n && (n.nomComplet || n.email)) return n;
    }
  } catch {}
  return normaliserUtilisateur(obtenirUtilisateurDepuisToken());
}

function formaterDate(date) {
  if (!date) return "Non définie";
  const v = String(date).slice(0, 10);
  const r = new Date(`${v}T00:00:00`);
  return Number.isNaN(r.getTime()) ? v : r.toLocaleDateString("fr-FR");
}
function formaterHeure(date) {
  if (!date) return "—";
  const r = new Date(date);
  return Number.isNaN(r.getTime()) ? "—" : r.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function obtenirEtatTentative(t) {
  if (t.statut === "terminee") return "terminee";
  if (typeof t.enLigneReel === "boolean") return t.enLigneReel ? "en_ligne" : "hors_ligne";
  const d = t.derniereActivite ? new Date(t.derniereActivite).getTime() : 0;
  return t.estEnLigne && Date.now() - d <= DELAI_HORS_LIGNE ? "en_ligne" : "hors_ligne";
}
function obtenirNomApprenant(t) {
  const a = t.apprenant || t.utilisateur || {};
  return t.nomApprenant || [a.prenom, a.nom].filter(Boolean).join(" ") || `Apprenant #${t.idApprenant ?? "?"}`;
}
function normaliserTexte(v) {
  return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
}
function obtenirResultatTentative(t) { return t.resultat || t.evaluation?.resultat || t.Evaluation?.resultat || ""; }
function obtenirScore(t) { return t.score ?? t.note ?? t.scoreFinal ?? t.evaluation?.score ?? null; }
function obtenirStatutCertificat(t) { return t.statutCertificat || t.certificat?.statutCertificat || t.Certificat?.statutCertificat || t.certificat?.statut || ""; }
function tentativeReussie(t) {
  const r = normaliserTexte(obtenirResultatTentative(t));
  if (["reussi", "reussie", "success", "passed"].includes(r)) return true;
  if (["echoue", "echouee", "failed", "fail"].includes(r)) return false;
  const score = obtenirScore(t);
  const seuil = t.seuilReussite ?? t.quiz?.seuilReussite;
  if (score != null && seuil != null) return Number(score) >= Number(seuil);
  return false;
}

export default function FormateurDashboard() {
  const router = useRouter();
  const [formations, setFormations] = useState([]);
  const [modules, setModules] = useState([]);
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [afficherFormFormation, setAfficherFormFormation] = useState(false);
  const [formationEnCours, setFormationEnCours] = useState(formationInitiale);
  const [creationFormation, setCreationFormation] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [tentatives, setTentatives] = useState([]);
  const [showProfil, setShowProfil] = useState(false);
  const [photoProfil, setPhotoProfil] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("photoProfilFormateur") || ""));
  const fileRef = useRef(null);

  const changerPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPhotoProfil(reader.result); localStorage.setItem("photoProfilFormateur", reader.result); };
    reader.readAsDataURL(file);
  };

  const chargerDashboard = useCallback(async () => {
    try {
      const d = await recupererDonnees();
      setFormations(d.formations); setModules(d.modules); setErreur(""); return true;
    } catch (error) {
      setErreur(error.message || "Impossible de charger le tableau de bord.");
      if (error.status === 401 || error.status === 403) router.replace("/connexion");
      return false;
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    if (!obtenirToken()) { router.replace("/connexion"); return () => controller.abort(); }
    Promise.all([recupererProfilFormateur(controller.signal), recupererDonnees(controller.signal)])
      .then(([profil, donnees]) => {
        if (controller.signal.aborted) return;
        setUtilisateur(profil); setFormations(donnees.formations); setModules(donnees.modules);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setErreur(error.message || "Impossible de charger le tableau de bord.");
        if (error.status === 401 || error.status === 403) router.replace("/connexion");
      })
      .finally(() => { if (!controller.signal.aborted) setChargement(false); });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (!obtenirToken()) return;
    const controller = new AbortController();
    const charger = () => apiRequest("/tentatives", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setTentatives(extraireListe(data, "tentatives")); })
      .catch(() => {});
    charger();
    const intervalle = setInterval(charger, INTERVALLE_TENTATIVES);
    return () => { clearInterval(intervalle); controller.abort(); };
  }, []);

  const formationsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return formations;
    return formations.filter((f) => `${f.titre || ""} ${f.description || ""}`.toLowerCase().includes(terme));
  }, [formations, recherche]);

  const obtenirModules = useCallback((numFormation) => modules.filter((m) => String(m.numFormation) === String(numFormation)).sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0)), [modules]);

  const nombreModules = modules.length;
  const formationsAvecModules = formations.filter((f) => obtenirModules(f.numFormation).length > 0).length;
  const formationsSansModules = formations.length - formationsAvecModules;

  const nomComplet = utilisateur?.nomComplet || `${utilisateur?.prenom || ""} ${utilisateur?.nom || ""}`.trim() || utilisateur?.username || "Formateur";
  const emailFormateur = utilisateur?.email || "";
  const initiale = String(nomComplet || "F").charAt(0).toUpperCase();
  const photoAffichee = photoProfil || utilisateur?.photo || "";

  const nombreEnLigne = tentatives.filter((t) => obtenirEtatTentative(t) === "en_ligne").length;
  const nombreHorsLigne = tentatives.filter((t) => obtenirEtatTentative(t) === "hors_ligne").length;
  const tentativesTerminees = tentatives.filter((t) => normaliserTexte(t.statut) === "terminee");
  const tentativesReussies = tentativesTerminees.filter(tentativeReussie);
  const certificatsEnAttente = tentativesReussies.filter((t) => ["enattente", "pending", "nonvalide", "nonattribue", ""].includes(normaliserTexte(obtenirStatutCertificat(t))));
  const certificatsValides = tentativesReussies.filter((t) => ["validee", "valide", "approved", "approuve"].includes(normaliserTexte(obtenirStatutCertificat(t))));

  const afficherMessage = (message, type = "succes") => {
    if (type === "erreur") { setErreur(message); setSucces(""); } else { setSucces(message); setErreur(""); }
  };
  const ouvrirFormulaireFormation = () => { setFormationEnCours({ ...formationInitiale }); setAfficherFormFormation(true); setErreur(""); setSucces(""); };

  const creerFormation = async (event) => {
    event.preventDefault();
    if (!formationEnCours.titre.trim()) return afficherMessage("Le titre de la formation est obligatoire.", "erreur");
    if (!formationEnCours.dateDebut) return afficherMessage("La date de début est obligatoire.", "erreur");
    if (formationEnCours.dateFin && formationEnCours.dateFin < formationEnCours.dateDebut) return afficherMessage("La date de fin doit être postérieure à la date de début.", "erreur");
    setCreationFormation(true);
    try {
      await apiRequest("/formations", { method: "POST", body: JSON.stringify({ titre: formationEnCours.titre.trim(), description: formationEnCours.description.trim(), dateDebut: formationEnCours.dateDebut, dateFin: formationEnCours.dateFin || null }) });
      setFormationEnCours({ ...formationInitiale }); setAfficherFormFormation(false);
      if (await chargerDashboard()) afficherMessage("Formation créée avec succès.");
    } catch (error) { afficherMessage(error.message, "erreur"); } finally { setCreationFormation(false); }
  };

  const supprimerFormation = async (numFormation) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette formation ?")) return;
    try { await apiRequest(`/formations/${numFormation}`, { method: "DELETE" }); if (await chargerDashboard()) afficherMessage("Formation supprimée avec succès."); }
    catch (error) { afficherMessage(error.message, "erreur"); }
  };

  const fermerSession = () => {
    sessionStorage.removeItem("token"); localStorage.removeItem("token"); localStorage.removeItem("utilisateur"); localStorage.removeItem("user");
    router.replace("/connexion");
  };

  return (
    <div className={styles.dashboard}>
      {/* SIDEBAR PC */}
      <aside className={styles.sidebar}>
        <Link href="/dashboard/formateur" className={styles.logo}><span className={styles.logoIcon}>L</span><span>LEARNING <strong>PRO</strong></span></Link>
        <div className={styles.sidebarLabel}>MENU PRINCIPAL</div>
        <nav className={styles.navigation}>
          <Link href="/dashboard/formateur" className={`${styles.navLink} ${styles.active}`}><LayoutDashboard size={20} /> Tableau de bord</Link>
          <Link href="/dashboard/formateur/formations" className={styles.navLink}><BookOpen size={20} /> Mes formations</Link>
          <Link href="/dashboard/formateur/modules" className={styles.navLink}><Layers size={20} /> Mes modules</Link>
          <Link href="/dashboard/formateur/quiz" className={styles.navLink}><FileText size={20} /> Quiz et évaluations</Link>
          <Link href="/dashboard/formateur/tentatives" className={styles.navLink}><Clock size={20} /> Tentatives des apprenants</Link>
          <Link href="/dashboard/formateur/resultats" className={styles.navLink}><BarChart3 size={20} /> Résultats</Link>
          <Link href="/dashboard/formateur/certificats" className={styles.navLink}><Trophy size={20} /> Certifications</Link>
          <Link href="/dashboard/formateur/profil" className={styles.navLink}><User size={20} /> Mon profil</Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.profileMiniButton} onClick={() => setShowProfil(true)}>
            <div className={styles.sidebarProfile}>
              {photoAffichee ? <img src={photoAffichee} alt="Profil" className={styles.avatarImg} /> : <div className={styles.avatar}>{initiale}</div>}
              <div className={styles.profileInfo}><strong>{nomComplet}</strong><span>Formateur • Voir mon profil</span></div>
            </div>
          </button>
          <button type="button" className={styles.logoutButton} onClick={fermerSession}><LogOut size={18} /> Déconnexion</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div><span className={styles.topbarSubtitle}>VOTRE ESPACE DE TRAVAIL</span><h1>Tableau de bord</h1></div>
          <button type="button" className={styles.topProfileButton} onClick={() => setShowProfil(true)}>
            <div className={styles.topbarUser}>
              {photoAffichee ? <img src={photoAffichee} alt="Profil" className={styles.avatarImg} /> : <div className={styles.avatarSmall}>{initiale}</div>}
              <div><strong>{nomComplet}</strong><span>Formateur</span></div>
            </div>
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div className={styles.welcomeText}>
              <span className={styles.welcomeTag}>ESPACE FORMATEUR</span>
              <h2>Bonjour, {nomComplet} !</h2>
              <p>Créez vos formations, organisez vos modules, suivez les évaluations et validez les certificats de vos apprenants.</p>
              <button type="button" className={styles.welcomeButton} onClick={ouvrirFormulaireFormation}><Plus size={18} /> Créer une formation</button>
            </div>
            <div className={styles.welcomeDecoration}>
              <div className={styles.decorationCircle}><GraduationCap size={48} /></div>
              <div className={styles.decorationText}><strong>Enseignez.</strong><strong>Partagez.</strong><strong>Faites progresser.</strong></div>
            </div>
          </section>

          {erreur && <div className={styles.errorMessage}><span>!</span>{erreur}<button type="button" onClick={() => setErreur("")}>×</button></div>}
          {succes && <div className={styles.successMessage}><span>✓</span>{succes}<button type="button" onClick={() => setSucces("")}>×</button></div>}

          {/* STATS */}
          <section className={styles.statsGrid}>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.blueIcon}`}><BookOpen size={22} /></div><div><span>Mes formations</span><strong>{chargement ? "—" : formations.length}</strong><small>Formations créées</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.blueIcon}`}><Layers size={22} /></div><div><span>Mes modules</span><strong>{chargement ? "—" : nombreModules}</strong><small>Modules créés</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.orangeIcon}`}><CheckCircle2 size={22} /></div><div><span>Avec des modules</span><strong>{formationsAvecModules}</strong><small>Formations organisées</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.purpleIcon}`}><Plus size={22} /></div><div><span>À compléter</span><strong>{formationsSansModules}</strong><small>Sans module</small></div></article>
          </section>

          <section className={styles.statsGrid}>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.orangeIcon}`}><Clock size={22} /></div><div><span>Tentatives en cours</span><strong>{nombreEnLigne}</strong><small>Apprenants en ligne</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.blueIcon}`}><Eye size={22} /></div><div><span>Hors ligne</span><strong>{nombreHorsLigne}</strong><small>Activité récente ou interrompue</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.blueIcon}`}><CheckCircle2 size={22} /></div><div><span>Quiz réussis</span><strong>{tentativesReussies.length}</strong><small>Tentatives réussies</small></div></article>
            <article className={styles.statCard}><div className={`${styles.statIcon} ${styles.orangeIcon}`}><Award size={22} /></div><div><span>Certificats à examiner</span><strong>{certificatsEnAttente.length}</strong><small>Demandes en attente</small></div></article>
          </section>

          {/* FORMULAIRE CRÉATION - reste sur dashboard, liste complète = page Formations */}
          {afficherFormFormation && (
            <form className={styles.creationForm} onSubmit={creerFormation}>
              <div className={styles.formHeading}><div><h3>Créer une formation</h3><p>Renseignez les informations de votre nouvelle formation.</p></div><button type="button" className={styles.closeButton} onClick={() => setAfficherFormFormation(false)}>×</button></div>
              <div className={styles.formGrid}>
                <label className={styles.fullWidth}>Titre de la formation *<input type="text" value={formationEnCours.titre} onChange={(e) => setFormationEnCours((p) => ({ ...p, titre: e.target.value }))} placeholder="Ex : Développement web avec React" required /></label>
                <label className={styles.fullWidth}>Description<textarea value={formationEnCours.description} onChange={(e) => setFormationEnCours((p) => ({ ...p, description: e.target.value }))} placeholder="Décrivez brièvement cette formation..." rows={3} /></label>
                <label>Date de début *<input type="date" value={formationEnCours.dateDebut} onChange={(e) => setFormationEnCours((p) => ({ ...p, dateDebut: e.target.value }))} required /></label>
                <label>Date de fin<input type="date" value={formationEnCours.dateFin} min={formationEnCours.dateDebut || undefined} onChange={(e) => setFormationEnCours((p) => ({ ...p, dateFin: e.target.value }))} /></label>
              </div>
              <div className={styles.formActions}><button type="button" className={styles.cancelButton} onClick={() => setAfficherFormFormation(false)}>Annuler</button><button type="submit" className={styles.primaryButton} disabled={creationFormation}>{creationFormation ? "Création..." : "Créer la formation"}</button></div>
            </form>
          )}

          {/* ACCÈS RAPIDE - CHAQUE CARTE = SA PROPRE PAGE */}
          <section className={styles.quickSection}>
            <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>ACCÈS RAPIDE</span><h2>Gérer mes activités</h2></div></div>
            <div className={styles.quickGrid}>
              <Link href="/dashboard/formateur/formations" className={styles.quickCard}><div className={styles.quickIcon}><BookOpen size={22} /></div><div><strong>Mes formations</strong><span>{formations.length} formation(s) — créer, voir, modifier</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
              <Link href="/dashboard/formateur/modules" className={styles.quickCard}><div className={styles.quickIcon}><Layers size={22} /></div><div><strong>Gérer les modules</strong><span>Organiser les contenus de vos formations</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
              <Link href="/dashboard/formateur/quiz" className={styles.quickCard}><div className={styles.quickIcon}><FileText size={22} /></div><div><strong>Créer un quiz</strong><span>Préparer des évaluations pour les apprenants</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
              <Link href="/dashboard/formateur/tentatives" className={styles.quickCard}><div className={styles.quickIcon}><Clock size={22} /></div><div><strong>Suivre les tentatives</strong><span>Voir qui a passé les quiz et combien de fois</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
              <Link href="/dashboard/formateur/resultats" className={styles.quickCard}><div className={styles.quickIcon}><BarChart3 size={22} /></div><div><strong>Consulter les résultats</strong><span>{tentativesTerminees.length} terminée(s) · {tentativesReussies.length} réussie(s)</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
              <Link href="/dashboard/formateur/certificats" className={styles.quickCard}><div className={styles.quickIcon}><Trophy size={22} /></div><div><strong>Certifications</strong><span>{certificatsEnAttente.length} en attente · {certificatsValides.length} validé(s)</span></div><span className={styles.quickArrow}><ArrowRight size={18} /></span></Link>
            </div>
          </section>

          {/* APERÇU FORMATIONS - 3 dernières, le reste = page Formations */}
          <section className={styles.formationsSection}>
            <div className={styles.sectionHeading}>
              <div><span className={styles.sectionEyebrow}>VOTRE CONTENU</span><h2>Aperçu de mes formations</h2><p>Les 3 dernières. La liste complète est sur la page Formations.</p></div>
              <Link href="/dashboard/formateur/formations" className={styles.primaryButton}>Tout voir →</Link>
            </div>
            <div className={styles.listToolbar}>
              <div><strong>Recherche rapide</strong><span>{formations.length} formation(s)</span></div>
              <div className={styles.searchWrap}><Search size={16} /><input type="search" className={styles.searchInput} placeholder="Rechercher une formation..." value={recherche} onChange={(e) => setRecherche(e.target.value)} /></div>
            </div>
            {chargement ? (
              <div className={styles.loadingState}><div className={styles.loader}></div><p>Chargement de vos formations...</p></div>
            ) : formationsFiltrees.length === 0 ? (
              <div className={styles.emptyState}><div className={styles.emptyIcon}><BookOpen size={44} /></div><h3>{recherche ? "Aucune formation trouvée" : "Vous n'avez pas encore de formation"}</h3><p>{recherche ? "Essayez avec un autre mot-clé." : "Commencez par créer votre première formation."}</p>{!recherche && <button type="button" className={styles.primaryButton} onClick={ouvrirFormulaireFormation}>+ Créer ma première formation</button>}</div>
            ) : (
              <div className={styles.formationList}>
                {formationsFiltrees.slice(0, 3).map((formation) => {
                  const mods = obtenirModules(formation.numFormation);
                  return (
                    <article className={styles.formationCard} key={formation.numFormation}>
                      <div className={styles.formationCardHeader}>
                        <div className={styles.formationTitleGroup}><div className={styles.formationIcon}><BookOpen size={20} /></div><div><h3>{formation.titre}</h3><span>Formation #{formation.numFormation}</span></div></div>
                        <span className={`${styles.statusBadge} ${mods.length > 0 ? styles.statusReady : styles.statusPending}`}>{mods.length > 0 ? "Contenu disponible" : "À compléter"}</span>
                      </div>
                      <p className={styles.formationDescription}>{formation.description || "Aucune description renseignée."}</p>
                      <div className={styles.formationMeta}><span><strong>Début :</strong> {formaterDate(formation.dateDebut)}</span><span><strong>Fin :</strong> {formaterDate(formation.dateFin)}</span><span><strong>{mods.length}</strong> module(s)</span></div>
                      <div className={styles.formationFooter}>
                        <Link href="/dashboard/formateur/formations" className={styles.manageLink}>Gérer cette formation →</Link>
                        <button type="button" className={styles.deleteFormationButton} onClick={() => supprimerFormation(formation.numFormation)}>Supprimer la formation</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* APERÇU TENTATIVES RÉCENTES */}
          <section className={styles.formationsSection}>
            <div className={styles.sectionHeading}><div><span className={styles.sectionEyebrow}>SUIVI DES APPRENANTS</span><h2>Dernières tentatives</h2><p>{nombreEnLigne} en ligne · {nombreHorsLigne} hors ligne — mise à jour toutes les 5 secondes</p></div><Link href="/dashboard/formateur/tentatives" className={styles.primaryButton}>Tout voir →</Link></div>
            <div className={styles.lessonList}>
              {tentatives.length === 0 ? <div className={styles.noLessons}>Aucune tentative pour le moment.</div> : tentatives.slice(0, 3).map((t, i) => {
                const etat = obtenirEtatTentative(t);
                return (
                  <div className={styles.lessonItem} key={t.idTentative ?? i}>
                    <div className={styles.lessonInfo}><strong>{obtenirNomApprenant(t)}</strong><span>Question {t.questionActuelle ?? "—"} · {t.nbReponsesDonnees ?? 0} réponse(s) · Dernière activité : {formaterHeure(t.derniereActivite)}</span></div>
                    <span className={`${styles.statusBadge} ${etat === "hors_ligne" ? styles.statusPending : styles.statusReady}`}>{etat === "en_ligne" ? "En ligne" : etat === "hors_ligne" ? "A quitté l'onglet" : `Terminée${t.score != null ? ` (${t.score}%)` : ""}`}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <footer className={styles.footer}><span>Learning Pro</span><span>Votre espace de formation et d&apos;apprentissage</span></footer>
        </div>
      </main>

      {/* BOTTOM NAV TÉLÉPHONE */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard/formateur" className={`${styles.bottomNavLink} ${styles.active}`}><LayoutDashboard size={20} /><span>Accueil</span></Link>
        <Link href="/dashboard/formateur/formations" className={styles.bottomNavLink}><BookOpen size={20} /><span>Formations</span></Link>
        <Link href="/dashboard/formateur/modules" className={styles.bottomNavLink}><Layers size={20} /><span>Modules</span></Link>
        <Link href="/dashboard/formateur/quiz" className={styles.bottomNavLink}><FileText size={20} /><span>Quiz</span></Link>
        <Link href="/dashboard/formateur/certificats" className={styles.bottomNavLink}><Trophy size={20} /><span>Certificats</span></Link>
      </nav>

      {/* POPUP PROFIL */}
      {showProfil && (
        <div className={styles.profilOverlay} onClick={() => setShowProfil(false)}>
          <div className={styles.profilModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.profilClose} onClick={() => setShowProfil(false)}><X size={20} /></button>
            <div className={styles.profilHeader}>
              <div className={styles.profilPhotoWrap}>
                {photoAffichee ? <img src={photoAffichee} alt="Profil" className={styles.profilPhoto} /> : <div className={styles.profilAvatar}>{initiale}</div>}
                <button type="button" className={styles.profilCamera} onClick={() => fileRef.current?.click()}><Camera size={16} /></button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={changerPhoto} />
              </div>
              <h2>{nomComplet}</h2><span className={styles.profilRole}>Formateur</span>
            </div>
            <div className={styles.profilInfos}>
              <div className={styles.profilRow}><User size={18} /><div><small>Nom complet</small><strong>{nomComplet}</strong></div></div>
              <div className={styles.profilRow}><Mail size={18} /><div><small>Adresse email</small><strong>{emailFormateur || "Non renseignée"}</strong></div></div>
              <div className={styles.profilRow}><GraduationCap size={18} /><div><small>Rôle</small><strong>Formateur</strong></div></div>
              <div className={styles.profilRow}><BookOpen size={18} /><div><small>Formations créées</small><strong>{formations.length}</strong></div></div>
              <div className={styles.profilRow}><Layers size={18} /><div><small>Modules créés</small><strong>{nombreModules}</strong></div></div>
            </div>
            <Link href="/dashboard/formateur/profil" className={styles.profilFullButton}>Voir mon profil complet</Link>
            <button type="button" className={styles.profilLogout} onClick={fermerSession}><LogOut size={18} /> Se déconnecter</button>
          </div>
        </div>
      )}
    </div>
  );
}