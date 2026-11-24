"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./formateur.module.css";

const API = "http://localhost:5000/api/formateur";
const INTERVALLE_TENTATIVES = 5000;
const DELAI_HORS_LIGNE = 30000;

const formationInitiale = {
  titre: "",
  description: "",
  dateDebut: "",
  dateFin: ""
};

const moduleInitial = {
  titreModule: "",
  descriptionModule: "",
  ordre: 1,
  typeContenu: "video",
  contenu: ""
};

class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
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
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Impossible de contacter le serveur. Vérifiez le backend.");
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    throw new ApiError(
      data.message || "Accès refusé. Veuillez vous reconnecter.",
      response.status
    );
  }

  if (!response.ok) {
    throw new ApiError(data.message || "Une erreur est survenue.", response.status);
  }

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
    apiRequest("/modules", { signal })
  ]);

  return {
    formations: extraireListe(formationsData, "formations"),
    modules: extraireListe(modulesData, "modules")
  };
}

function obtenirUtilisateurDepuisToken() {
  try {
    const token = obtenirToken();
    if (!token) return null;

    const partie = token.split(".")[1];
    if (!partie) return null;

    const base64 = partie.replace(/-/g, "+").replace(/_/g, "/");

    return JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split("")
          .map((caractere) =>
            `%${caractere.charCodeAt(0).toString(16).padStart(2, "0")}`
          )
          .join("")
      )
    );
  } catch {
    return null;
  }
}

function formaterDate(date) {
  if (!date) return "Non définie";

  const valeur = String(date).slice(0, 10);
  const resultat = new Date(`${valeur}T00:00:00`);

  if (Number.isNaN(resultat.getTime())) return valeur;
  return resultat.toLocaleDateString("fr-FR");
}

function formaterHeure(date) {
  if (!date) return "—";

  const resultat = new Date(date);
  if (Number.isNaN(resultat.getTime())) return "—";

  return resultat.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function obtenirEtatTentative(tentative) {
  if (tentative.statut === "terminee") return "terminee";

  if (typeof tentative.enLigneReel === "boolean") {
    return tentative.enLigneReel ? "en_ligne" : "hors_ligne";
  }

  const derniere = tentative.derniereActivite
    ? new Date(tentative.derniereActivite).getTime()
    : 0;

  const recent =
    Number.isFinite(derniere) &&
    Date.now() - derniere <= DELAI_HORS_LIGNE;

  return tentative.estEnLigne && recent
    ? "en_ligne"
    : "hors_ligne";
}

function obtenirNomApprenant(tentative) {
  const apprenant = tentative.apprenant || tentative.utilisateur || {};

  const nomComplet = [apprenant.prenom, apprenant.nom]
    .filter(Boolean)
    .join(" ");

  return (
    tentative.nomApprenant ||
    nomComplet ||
    `Apprenant #${tentative.idApprenant ?? "?"}`
  );
}

function obtenirEmailApprenant(tentative) {
  return (
    tentative.emailApprenant ||
    tentative.apprenant?.email ||
    tentative.utilisateur?.email ||
    "Email non disponible"
  );
}

function obtenirTitreQuiz(tentative) {
  return (
    tentative.titreQuiz ||
    tentative.quiz?.nomQuiz ||
    tentative.Quiz?.nomQuiz ||
    `Quiz #${tentative.codeQuiz ?? "?"}`
  );
}

function obtenirTitreFormation(tentative) {
  return (
    tentative.titreFormation ||
    tentative.formation?.titre ||
    tentative.Formation?.titre ||
    tentative.quiz?.module?.formation?.titre ||
    "Formation non renseignée"
  );
}

function obtenirTitreModule(tentative) {
  return (
    tentative.titreModule ||
    tentative.module?.titreModule ||
    tentative.Module?.titreModule ||
    "Module non renseigné"
  );
}

function obtenirTypeContenu(module) {
  const type = (
    module.typeContenu ||
    module.type_contenu ||
    "lien"
  ).toLowerCase();

  if (type === "video") return "Vidéo";
  if (type === "pdf") return "PDF";
  return "Lien";
}

function obtenirResultatTentative(tentative) {
  const resultat =
    tentative.resultat ||
    tentative.evaluation?.resultat ||
    tentative.Evaluation?.resultat ||
    "";

  return String(resultat).trim().toLowerCase();
}

function obtenirScore(tentative) {
  return (
    tentative.score ??
    tentative.note ??
    tentative.scoreFinal ??
    tentative.evaluation?.score ??
    tentative.Evaluation?.score ??
    null
  );
}

function obtenirStatutCertificat(tentative) {
  return (
    tentative.statutCertificat ||
    tentative.certificat?.statutCertificat ||
    tentative.Certificat?.statutCertificat ||
    tentative.certificat?.statut ||
    ""
  );
}

function normaliserTexte(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

function tentativeReussie(tentative) {
  const resultat = normaliserTexte(obtenirResultatTentative(tentative));

  if (["reussi", "reussie", "success", "passed"].includes(resultat)) {
    return true;
  }

  if (["echoue", "echouee", "failed", "fail"].includes(resultat)) {
    return false;
  }

  const score = obtenirScore(tentative);
  const seuil =
    tentative.seuilReussite ??
    tentative.quiz?.seuilReussite ??
    tentative.Quiz?.seuilReussite;

  if (score != null && seuil != null) {
    return Number(score) >= Number(seuil);
  }

  return false;
}

function obtenirStatutResultat(tentative) {
  const resultat = normaliserTexte(obtenirResultatTentative(tentative));

  if (["reussi", "reussie", "success", "passed"].includes(resultat)) {
    return "Réussi";
  }

  if (["echoue", "echouee", "failed", "fail"].includes(resultat)) {
    return "Échoué";
  }

  const score = obtenirScore(tentative);
  const seuil =
    tentative.seuilReussite ??
    tentative.quiz?.seuilReussite ??
    tentative.Quiz?.seuilReussite;

  if (score != null && seuil != null) {
    return Number(score) >= Number(seuil) ? "Réussi" : "Échoué";
  }

  return "Non évalué";
}

function obtenirLibelleCertificat(tentative) {
  const statut = normaliserTexte(obtenirStatutCertificat(tentative));

  if (["validee", "valide", "approved", "approuve"].includes(statut)) {
    return "Validé";
  }

  if (
    ["enattente", "pending", "nonvalide", "nonattribue", ""].includes(statut)
  ) {
    return "En attente";
  }

  if (["annulee", "annule", "refuse", "refusee", "rejected"].includes(statut)) {
    return "Refusé";
  }

  return obtenirStatutCertificat(tentative) || "Non attribué";
}

function obtenirNombreTentatives(tentative) {
  return (
    tentative.numeroTentative ??
    tentative.nombreTentatives ??
    tentative.nbTentatives ??
    tentative.tentative ??
    "—"
  );
}

function obtenirDateTentative(tentative) {
  return (
    tentative.dateFin ||
    tentative.dateTerminaison ||
    tentative.dateTentative ||
    tentative.updatedAt ||
    tentative.createdAt ||
    null
  );
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

  const [formationSelectionnee, setFormationSelectionnee] = useState(null);
  const [moduleEnCours, setModuleEnCours] = useState(moduleInitial);

  const [creationFormation, setCreationFormation] = useState(false);
  const [creationModule, setCreationModule] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [tentatives, setTentatives] = useState([]);
  const [chargementTentatives, setChargementTentatives] = useState(true);
  const [filtreResultat, setFiltreResultat] = useState("tous");

  const chargerDashboard = useCallback(async () => {
    try {
      const donnees = await recupererDonnees();
      setFormations(donnees.formations);
      setModules(donnees.modules);
      setErreur("");
      return true;
    } catch (error) {
      setErreur(error.message || "Impossible de charger le tableau de bord.");

      if (error.status === 401 || error.status === 403) {
        router.replace("/connexion");
      }

      return false;
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();

    if (!obtenirToken()) {
      router.replace("/connexion");
      return () => controller.abort();
    }

    recupererDonnees(controller.signal)
      .then((donnees) => {
        if (controller.signal.aborted) return;

        setUtilisateur(obtenirUtilisateurDepuisToken());
        setFormations(donnees.formations);
        setModules(donnees.modules);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;

        setErreur(error.message || "Impossible de charger le tableau de bord.");

        if (error.status === 401 || error.status === 403) {
          router.replace("/connexion");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });

    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (!obtenirToken()) return;

    const controller = new AbortController();

    const charger = () =>
      apiRequest("/tentatives", { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted) {
            setTentatives(extraireListe(data, "tentatives"));
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) {
            setChargementTentatives(false);
          }
        });

    charger();

    const intervalle = setInterval(charger, INTERVALLE_TENTATIVES);

    return () => {
      clearInterval(intervalle);
      controller.abort();
    };
  }, []);

  const formationsFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) return formations;

    return formations.filter((formation) =>
      `${formation.titre || ""} ${formation.description || ""}`
        .toLowerCase()
        .includes(terme)
    );
  }, [formations, recherche]);

  const obtenirModules = useCallback(
    (numFormation) =>
      modules
        .filter(
          (module) =>
            String(module.numFormation) === String(numFormation)
        )
        .sort(
          (a, b) =>
            Number(a.ordre || 0) - Number(b.ordre || 0)
        ),
    [modules]
  );

  const nombreModules = modules.length;

  const formationsAvecModules = formations.filter(
    (formation) =>
      obtenirModules(formation.numFormation).length > 0
  ).length;

  const formationsSansModules =
    formations.length - formationsAvecModules;

  const nomFormateur =
    utilisateur?.prenom ||
    utilisateur?.nom ||
    utilisateur?.username ||
    "Formateur";

  const nombreEnLigne = tentatives.filter(
    (tentative) => obtenirEtatTentative(tentative) === "en_ligne"
  ).length;

  const nombreHorsLigne = tentatives.filter(
    (tentative) => obtenirEtatTentative(tentative) === "hors_ligne"
  ).length;

  const tentativesTerminees = tentatives.filter(
    (tentative) => normaliserTexte(tentative.statut) === "terminee"
  );

  const tentativesReussies = tentativesTerminees.filter(tentativeReussie);

  const tentativesEchouees = tentativesTerminees.filter(
    (tentative) => obtenirStatutResultat(tentative) === "Échoué"
  );

  const certificatsEnAttente = tentativesReussies.filter((tentative) => {
    const statut = normaliserTexte(obtenirStatutCertificat(tentative));

    return [
      "enattente",
      "pending",
      "nonvalide",
      "nonattribue",
      ""
    ].includes(statut);
  });

  const certificatsValides = tentativesReussies.filter((tentative) => {
    const statut = normaliserTexte(obtenirStatutCertificat(tentative));

    return ["validee", "valide", "approved", "approuve"].includes(statut);
  });

  const resultatsFiltres = useMemo(() => {
    if (filtreResultat === "tous") return tentativesTerminees;
    if (filtreResultat === "reussis") return tentativesReussies;
    if (filtreResultat === "echoues") return tentativesEchouees;

    return tentativesTerminees.filter((tentative) => {
      const statut = normaliserTexte(obtenirStatutCertificat(tentative));
      return ["validee", "valide", "approved", "approuve"].includes(statut);
    });
  }, [tentativesTerminees, tentativesReussies, tentativesEchouees, filtreResultat]);

  const afficherMessage = (message, type = "succes") => {
    if (type === "erreur") {
      setErreur(message);
      setSucces("");
    } else {
      setSucces(message);
      setErreur("");
    }
  };

  const ouvrirFormulaireFormation = () => {
    setFormationEnCours({ ...formationInitiale });
    setAfficherFormFormation(true);
    setErreur("");
    setSucces("");
  };

  const creerFormation = async (event) => {
    event.preventDefault();

    if (!formationEnCours.titre.trim()) {
      afficherMessage("Le titre de la formation est obligatoire.", "erreur");
      return;
    }

    if (!formationEnCours.dateDebut) {
      afficherMessage("La date de début est obligatoire.", "erreur");
      return;
    }

    if (
      formationEnCours.dateFin &&
      formationEnCours.dateFin < formationEnCours.dateDebut
    ) {
      afficherMessage(
        "La date de fin doit être postérieure à la date de début.",
        "erreur"
      );
      return;
    }

    setCreationFormation(true);
    setErreur("");
    setSucces("");

    try {
      await apiRequest("/formations", {
        method: "POST",
        body: JSON.stringify({
          titre: formationEnCours.titre.trim(),
          description: formationEnCours.description.trim(),
          dateDebut: formationEnCours.dateDebut,
          dateFin: formationEnCours.dateFin || null
        })
      });

      setFormationEnCours({ ...formationInitiale });
      setAfficherFormFormation(false);

      if (await chargerDashboard()) {
        afficherMessage("Formation créée avec succès.");
      }
    } catch (error) {
      afficherMessage(error.message, "erreur");
    } finally {
      setCreationFormation(false);
    }
  };

  const creerModule = async (event, numFormation) => {
    event.preventDefault();

    if (!moduleEnCours.titreModule.trim()) {
      afficherMessage("Le titre du module est obligatoire.", "erreur");
      return;
    }

    if (
      !Number.isInteger(Number(moduleEnCours.ordre)) ||
      Number(moduleEnCours.ordre) < 1
    ) {
      afficherMessage("L'ordre doit être un nombre entier positif.", "erreur");
      return;
    }

    if (!moduleEnCours.contenu.trim()) {
      afficherMessage("Le lien du contenu est obligatoire.", "erreur");
      return;
    }

    setCreationModule(true);
    setErreur("");
    setSucces("");

    try {
      await apiRequest("/modules", {
        method: "POST",
        body: JSON.stringify({
          titreModule: moduleEnCours.titreModule.trim(),
          descriptionModule: moduleEnCours.descriptionModule.trim(),
          ordre: Number(moduleEnCours.ordre),
          numFormation: Number(numFormation),
          typeContenu: moduleEnCours.typeContenu,
          contenu: moduleEnCours.contenu.trim()
        })
      });

      setModuleEnCours({ ...moduleInitial });
      setFormationSelectionnee(null);

      if (await chargerDashboard()) {
        afficherMessage("Module ajouté avec succès à la formation.");
      }
    } catch (error) {
      afficherMessage(error.message, "erreur");
    } finally {
      setCreationModule(false);
    }
  };

  const supprimerFormation = async (numFormation) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette formation ?")) {
      return;
    }

    try {
      await apiRequest(`/formations/${numFormation}`, {
        method: "DELETE"
      });

      if (await chargerDashboard()) {
        afficherMessage("Formation supprimée avec succès.");
      }
    } catch (error) {
      afficherMessage(error.message, "erreur");
    }
  };

  const supprimerModule = async (codeModule) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce module ?")) {
      return;
    }

    try {
      await apiRequest(`/modules/${codeModule}`, {
        method: "DELETE"
      });

      if (await chargerDashboard()) {
        afficherMessage("Module supprimé avec succès.");
      }
    } catch (error) {
      afficherMessage(error.message, "erreur");
    }
  };

  const fermerSession = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    router.replace("/connexion");
  };

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
          <Link href="/dashboard/formateur" className={`${styles.navLink} ${styles.active}`}>
            <span>▦</span>
            Tableau de bord
          </Link>

          <a href="#formations" className={styles.navLink}>
            <span>▤</span>
            Mes formations
          </a>

          <Link href="/dashboard/formateur/modules" className={styles.navLink}>
            <span>▣</span>
            Mes modules
          </Link>

          <Link href="/dashboard/formateur/quiz" className={styles.navLink}>
            <span>✎</span>
            Quiz et évaluations
          </Link>

          <Link href="/dashboard/formateur/tentatives" className={styles.navLink}>
            <span>◷</span>
            Tentatives des apprenants
          </Link>

          <Link href="/dashboard/formateur/resultats" className={styles.navLink}>
            <span>▥</span>
            Résultats
          </Link>

          <Link href="/dashboard/formateur/certificats" className={styles.navLink}>
            <span>♧</span>
            Certifications
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarProfile}>
            <div className={styles.avatar}>
              {String(nomFormateur).charAt(0).toUpperCase()}
            </div>
            <div className={styles.profileInfo}>
              <strong>{nomFormateur}</strong>
              <span>Formateur</span>
            </div>
          </div>

          <button type="button" className={styles.logoutButton} onClick={fermerSession}>
            <span>↪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.topbarSubtitle}>Votre espace de travail</span>
            <h1>Tableau de bord</h1>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.topbarUser}>
              <div className={styles.avatarSmall}>
                {String(nomFormateur).charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{nomFormateur}</strong>
                <span>Formateur</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div className={styles.welcomeText}>
              <span className={styles.welcomeTag}>ESPACE FORMATEUR</span>
              <h2>Bonjour, {nomFormateur} !</h2>
              <p>
                Créez vos formations, organisez vos modules, suivez les
                évaluations et validez les certificats de vos apprenants.
              </p>

              <button
                type="button"
                className={styles.welcomeButton}
                onClick={ouvrirFormulaireFormation}
              >
                + Créer une formation
              </button>
            </div>

            <div className={styles.welcomeDecoration}>
              <div className={styles.decorationCircle}>✦</div>
              <div className={styles.decorationText}>
                <strong>Enseignez.</strong>
                <strong>Partagez.</strong>
                <strong>Faites progresser.</strong>
              </div>
            </div>
          </section>

          {erreur && (
            <div className={styles.errorMessage}>
              <span>!</span>
              {erreur}
              <button type="button" onClick={() => setErreur("")}>×</button>
            </div>
          )}

          {succes && (
            <div className={styles.successMessage}>
              <span>✓</span>
              {succes}
              <button type="button" onClick={() => setSucces("")}>×</button>
            </div>
          )}

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>▤</div>
              <div>
                <span>Mes formations</span>
                <strong>{formations.length}</strong>
                <small>Formations créées</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>▣</div>
              <div>
                <span>Mes modules</span>
                <strong>{nombreModules}</strong>
                <small>Modules créés</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>✓</div>
              <div>
                <span>Avec des modules</span>
                <strong>{formationsAvecModules}</strong>
                <small>Formations organisées</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.purpleIcon}`}>＋</div>
              <div>
                <span>À compléter</span>
                <strong>{formationsSansModules}</strong>
                <small>Sans module</small>
              </div>
            </article>
          </section>

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>◷</div>
              <div>
                <span>Tentatives en cours</span>
                <strong>{nombreEnLigne}</strong>
                <small>Apprenants en ligne</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.blueIcon}`}>◉</div>
              <div>
                <span>Hors ligne</span>
                <strong>{nombreHorsLigne}</strong>
                <small>Activité récente ou interrompue</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.greenIcon}`}>✓</div>
              <div>
                <span>Quiz réussis</span>
                <strong>{tentativesReussies.length}</strong>
                <small>Tentatives réussies enregistrées</small>
              </div>
            </article>

            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.orangeIcon}`}>♧</div>
              <div>
                <span>Certificats à examiner</span>
                <strong>{certificatsEnAttente.length}</strong>
                <small>Demandes en attente</small>
              </div>
            </article>
          </section>

          <section className={styles.quickSection}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>ACCÈS RAPIDE</span>
                <h2>Gérer mes activités</h2>
              </div>
            </div>

            <div className={styles.quickGrid}>
              <Link href="/dashboard/formateur/modules" className={styles.quickCard}>
                <div className={styles.quickIcon}>▣</div>
                <div>
                  <strong>Gérer les modules</strong>
                  <span>Organiser les contenus de vos formations</span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link href="/dashboard/formateur/quiz" className={styles.quickCard}>
                <div className={styles.quickIcon}>✎</div>
                <div>
                  <strong>Créer un quiz</strong>
                  <span>Préparer des évaluations pour les apprenants</span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link href="/dashboard/formateur/tentatives" className={styles.quickCard}>
                <div className={styles.quickIcon}>◷</div>
                <div>
                  <strong>Suivre les tentatives</strong>
                  <span>Voir qui a passé les quiz et combien de fois</span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link href="/dashboard/formateur/resultats" className={styles.quickCard}>
                <div className={styles.quickIcon}>▥</div>
                <div>
                  <strong>Consulter les résultats</strong>
                  <span>Suivre les performances des apprenants</span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>
            </div>
          </section>

          <section className={styles.formationsSection} id="certifications">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>DÉLIVRANCE OFFICIELLE</span>
                <h2>Gestion des certifications</h2>
                <p>
                  Examinez les tentatives réussies et décidez si les
                  certificats peuvent être délivrés.
                </p>
              </div>
            </div>

            <div className={styles.quickGrid}>
              <Link
                href="/dashboard/formateur/certificats"
                className={styles.quickCard}
              >
                <div className={styles.quickIcon}>♧</div>
                <div>
                  <strong>Examiner les certificats</strong>
                  <span>
                    Consulter les demandes, examiner les tentatives,
                    valider ou refuser les certificats.
                  </span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link
                href="/dashboard/formateur/tentatives"
                className={styles.quickCard}
              >
                <div className={styles.quickIcon}>◷</div>
                <div>
                  <strong>Examiner la surveillance</strong>
                  <span>
                    Vérifier les scores, les sorties d&apos;écran et les
                    détails des tentatives avant décision.
                  </span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>
            </div>

            <div className={styles.lessonList}>
              <div className={styles.lessonItem}>
                <div className={styles.lessonInfo}>
                  <strong>Certificats en attente</strong>
                  <span>
                    {certificatsEnAttente.length} tentative(s) réussie(s)
                    détectée(s) en attente de validation.
                  </span>
                </div>
                <Link
                  href="/dashboard/formateur/certificats"
                  className={styles.manageLink}
                >
                  Examiner →
                </Link>
              </div>

              <div className={styles.lessonItem}>
                <div className={styles.lessonInfo}>
                  <strong>Certificats validés</strong>
                  <span>
                    {certificatsValides.length} certificat(s) validé(s)
                    détecté(s) dans les données de tentatives.
                  </span>
                </div>
                <Link
                  href="/dashboard/formateur/certificats"
                  className={styles.manageLink}
                >
                  Consulter →
                </Link>
              </div>
            </div>
          </section>

          <section className={styles.formationsSection} id="resultats">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>ÉVALUATIONS</span>
                <h2>Résultats des quiz</h2>
                <p>
                  Consultez les performances, les scores, les réussites
                  et le statut de validation des certificats.
                </p>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <article className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.blueIcon}`}>▥</div>
                <div>
                  <span>Terminées</span>
                  <strong>{tentativesTerminees.length}</strong>
                  <small>Évaluations terminées</small>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.greenIcon}`}>✓</div>
                <div>
                  <span>Réussies</span>
                  <strong>{tentativesReussies.length}</strong>
                  <small>Résultats positifs</small>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.orangeIcon}`}>×</div>
                <div>
                  <span>Échouées</span>
                  <strong>{tentativesEchouees.length}</strong>
                  <small>Résultats négatifs</small>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.purpleIcon}`}>♧</div>
                <div>
                  <span>Certificats validés</span>
                  <strong>{certificatsValides.length}</strong>
                  <small>Décisions du formateur</small>
                </div>
              </article>
            </div>

            <div className={styles.listToolbar}>
              <div>
                <strong>Historique des évaluations</strong>
                <span>{resultatsFiltres.length} résultat(s)</span>
              </div>

              <select
                className={styles.searchInput}
                value={filtreResultat}
                onChange={(event) => setFiltreResultat(event.target.value)}
              >
                <option value="tous">Tous les résultats</option>
                <option value="reussis">Réussis</option>
                <option value="echoues">Échoués</option>
                <option value="certificats">Certificats validés</option>
              </select>
            </div>

            {chargementTentatives ? (
              <div className={styles.loadingState}>
                <div className={styles.loader}></div>
                <p>Chargement des résultats...</p>
              </div>
            ) : resultatsFiltres.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>▥</div>
                <h3>Aucun résultat disponible</h3>
                <p>
                  Les résultats des quiz terminés apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className={styles.lessonList}>
                {resultatsFiltres.map((tentative, index) => {
                  const reussie = tentativeReussie(tentative);
                  const score = obtenirScore(tentative);
                  const statutCertificat = obtenirLibelleCertificat(tentative);

                  return (
                    <article
                      className={styles.formationCard}
                      key={tentative.idTentative ?? index}
                    >
                      <div className={styles.formationCardHeader}>
                        <div className={styles.formationTitleGroup}>
                          <div className={styles.formationIcon}>
                            {reussie ? "✓" : "×"}
                          </div>
                          <div>
                            <h3>{obtenirNomApprenant(tentative)}</h3>
                            <span>{obtenirEmailApprenant(tentative)}</span>
                          </div>
                        </div>

                        <span
                          className={`${styles.statusBadge} ${
                            reussie
                              ? styles.statusReady
                              : styles.statusPending
                          }`}
                        >
                          {obtenirStatutResultat(tentative)}
                        </span>
                      </div>

                      <div className={styles.lessonList}>
                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Quiz</strong>
                            <span>{obtenirTitreQuiz(tentative)}</span>
                          </div>
                        </div>

                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Formation</strong>
                            <span>{obtenirTitreFormation(tentative)}</span>
                          </div>
                        </div>

                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Module</strong>
                            <span>{obtenirTitreModule(tentative)}</span>
                          </div>
                        </div>

                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Score</strong>
                            <span>
                              {score != null ? `${score}%` : "Non renseigné"}
                              {tentative.seuilReussite != null
                                ? ` · Seuil : ${tentative.seuilReussite}%`
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Nombre de tentatives</strong>
                            <span>{obtenirNombreTentatives(tentative)}</span>
                          </div>
                        </div>

                        <div className={styles.lessonItem}>
                          <div className={styles.lessonInfo}>
                            <strong>Date</strong>
                            <span>{formaterHeure(obtenirDateTentative(tentative))}</span>
                          </div>
                        </div>

                        {reussie && (
                          <div className={styles.lessonItem}>
                            <div className={styles.lessonInfo}>
                              <strong>Certification</strong>
                              <span>{statutCertificat}</span>
                            </div>

                            <span
                              className={`${styles.statusBadge} ${
                                normaliserTexte(statutCertificat) === "valide"
                                  ? styles.statusReady
                                  : styles.statusPending
                              }`}
                            >
                              {statutCertificat}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={styles.formationFooter}>
                        <Link
                          href="/dashboard/formateur/tentatives"
                          className={styles.manageLink}
                        >
                          Examiner la tentative →
                        </Link>

                        {reussie && (
                          <Link
                            href="/dashboard/formateur/certificats"
                            className={styles.manageLink}
                          >
                            {normaliserTexte(statutCertificat) === "valide"
                              ? "Consulter le certificat →"
                              : "Examiner la certification →"}
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className={styles.quickGrid}>
              <Link
                href="/dashboard/formateur/resultats"
                className={styles.quickCard}
              >
                <div className={styles.quickIcon}>▥</div>
                <div>
                  <strong>Page complète des résultats</strong>
                  <span>
                    Accéder à l&apos;historique détaillé et aux statistiques.
                  </span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link
                href="/dashboard/formateur/certificats"
                className={styles.quickCard}
              >
                <div className={styles.quickIcon}>♧</div>
                <div>
                  <strong>Valider les certificats</strong>
                  <span>
                    Examiner les demandes et prendre les décisions.
                  </span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>
            </div>
          </section>

          <section className={styles.formationsSection} id="tentatives">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>SUIVI DES APPRENANTS</span>
                <h2>Suivi des tentatives des apprenants</h2>
                <p>
                  Mise à jour automatique toutes les{" "}
                  {INTERVALLE_TENTATIVES / 1000} secondes ·{" "}
                  {nombreEnLigne} en ligne · {nombreHorsLigne} hors ligne
                </p>
              </div>
            </div>

            <div className={styles.lessonList}>
              {chargementTentatives ? (
                <div className={styles.noLessons}>Chargement des tentatives...</div>
              ) : tentatives.length === 0 ? (
                <div className={styles.noLessons}>
                  Aucune tentative pour le moment.
                </div>
              ) : (
                tentatives.map((tentative, index) => {
                  const etat = obtenirEtatTentative(tentative);

                  return (
                    <div
                      className={styles.lessonItem}
                      key={tentative.idTentative ?? index}
                    >
                      <div className={styles.lessonInfo}>
                        <strong>{obtenirNomApprenant(tentative)}</strong>
                        <span>
                          {obtenirTitreQuiz(tentative)}
                          {" — Question "}
                          {tentative.questionActuelle ?? "—"}
                          {" · "}
                          {tentative.nbReponsesDonnees ?? 0} réponse(s)
                          {" · "}
                          {tentative.nbSortiesEcran ?? 0} sortie(s) d&apos;écran
                          {" · Dernière activité : "}
                          {formaterHeure(tentative.derniereActivite)}
                        </span>
                      </div>

                      <span
                        className={`${styles.statusBadge} ${
                          etat === "hors_ligne"
                            ? styles.statusPending
                            : styles.statusReady
                        }`}
                      >
                        {etat === "en_ligne" && "🟢 En ligne"}
                        {etat === "hors_ligne" && "🟠 A quitté l'onglet"}
                        {etat === "terminee" &&
                          `✔ Terminée${
                            tentative.score != null
                              ? ` (${tentative.score}%)`
                              : ""
                          }`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className={styles.quickGrid}>
              <Link href="/dashboard/formateur/tentatives" className={styles.quickCard}>
                <div className={styles.quickIcon}>◷</div>
                <div>
                  <strong>Voir les tentatives</strong>
                  <span>
                    Liste complète des tentatives par apprenant,
                    quiz, date et score
                  </span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>

              <Link href="/dashboard/formateur/resultats" className={styles.quickCard}>
                <div className={styles.quickIcon}>▥</div>
                <div>
                  <strong>Voir les résultats</strong>
                  <span>Synthèse des scores et des performances</span>
                </div>
                <span className={styles.quickArrow}>→</span>
              </Link>
            </div>
          </section>

          <section className={styles.formationsSection} id="formations">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionEyebrow}>VOTRE CONTENU</span>
                <h2>Mes formations</h2>
                <p>Créez vos formations et organisez leurs modules.</p>
              </div>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={ouvrirFormulaireFormation}
              >
                + Nouvelle formation
              </button>
            </div>

            {afficherFormFormation && (
              <form className={styles.creationForm} onSubmit={creerFormation}>
                <div className={styles.formHeading}>
                  <div>
                    <h3>Créer une formation</h3>
                    <p>
                      Renseignez les informations de votre nouvelle formation.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={() => setAfficherFormFormation(false)}
                  >
                    ×
                  </button>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}>
                    Titre de la formation *
                    <input
                      type="text"
                      value={formationEnCours.titre}
                      onChange={(event) =>
                        setFormationEnCours((previous) => ({
                          ...previous,
                          titre: event.target.value
                        }))
                      }
                      placeholder="Ex : Développement web avec React"
                      required
                    />
                  </label>

                  <label className={styles.fullWidth}>
                    Description
                    <textarea
                      value={formationEnCours.description}
                      onChange={(event) =>
                        setFormationEnCours((previous) => ({
                          ...previous,
                          description: event.target.value
                        }))
                      }
                      placeholder="Décrivez brièvement cette formation..."
                      rows={3}
                    />
                  </label>

                  <label>
                    Date de début *
                    <input
                      type="date"
                      value={formationEnCours.dateDebut}
                      onChange={(event) =>
                        setFormationEnCours((previous) => ({
                          ...previous,
                          dateDebut: event.target.value
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Date de fin
                    <input
                      type="date"
                      value={formationEnCours.dateFin}
                      min={formationEnCours.dateDebut || undefined}
                      onChange={(event) =>
                        setFormationEnCours((previous) => ({
                          ...previous,
                          dateFin: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setAfficherFormFormation(false)}
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={creationFormation}
                  >
                    {creationFormation ? "Création..." : "Créer la formation"}
                  </button>
                </div>
              </form>
            )}

            <div className={styles.listToolbar}>
              <div>
                <strong>Liste des formations</strong>
                <span>{formations.length} formation(s)</span>
              </div>

              <input
                type="search"
                className={styles.searchInput}
                placeholder="Rechercher une formation..."
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
              />
            </div>

            {chargement ? (
              <div className={styles.loadingState}>
                <div className={styles.loader}></div>
                <p>Chargement de vos formations...</p>
              </div>
            ) : formationsFiltrees.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>▤</div>
                <h3>
                  {recherche
                    ? "Aucune formation trouvée"
                    : "Vous n'avez pas encore de formation"}
                </h3>
                <p>
                  {recherche
                    ? "Essayez avec un autre mot-clé."
                    : "Commencez par créer votre première formation."}
                </p>

                {!recherche && (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={ouvrirFormulaireFormation}
                  >
                    + Créer ma première formation
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.formationList}>
                {formationsFiltrees.map((formation) => {
                  const modulesFormation = obtenirModules(
                    formation.numFormation
                  );

                  const formulaireOuvert =
                    String(formationSelectionnee) ===
                    String(formation.numFormation);

                  return (
                    <article
                      className={styles.formationCard}
                      key={formation.numFormation}
                    >
                      <div className={styles.formationCardHeader}>
                        <div className={styles.formationTitleGroup}>
                          <div className={styles.formationIcon}>▤</div>
                          <div>
                            <h3>{formation.titre}</h3>
                            <span>
                              Formation #{formation.numFormation}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`${styles.statusBadge} ${
                            modulesFormation.length > 0
                              ? styles.statusReady
                              : styles.statusPending
                          }`}
                        >
                          {modulesFormation.length > 0
                            ? "Contenu disponible"
                            : "À compléter"}
                        </span>
                      </div>

                      <p className={styles.formationDescription}>
                        {formation.description ||
                          "Aucune description renseignée."}
                      </p>

                      <div className={styles.formationMeta}>
                        <span>
                          <strong>Début :</strong>{" "}
                          {formaterDate(formation.dateDebut)}
                        </span>
                        <span>
                          <strong>Fin :</strong>{" "}
                          {formaterDate(formation.dateFin)}
                        </span>
                        <span>
                          <strong>{modulesFormation.length}</strong> module(s)
                        </span>
                      </div>

                      <div className={styles.lessonHeader}>
                        <div>
                          <h4>Modules de la formation</h4>
                          <span>
                            Organisez les modules et leurs supports pédagogiques.
                          </span>
                        </div>

                        <button
                          type="button"
                          className={styles.addLessonButton}
                          onClick={() => {
                            setFormationSelectionnee(
                              formulaireOuvert
                                ? null
                                : formation.numFormation
                            );

                            setModuleEnCours({
                              ...moduleInitial,
                              ordre: modulesFormation.length + 1
                            });
                          }}
                        >
                          {formulaireOuvert
                            ? "Fermer"
                            : "+ Ajouter un module"}
                        </button>
                      </div>

                      {formulaireOuvert && (
                        <form
                          className={styles.lessonForm}
                          onSubmit={(event) =>
                            creerModule(event, formation.numFormation)
                          }
                        >
                          <h4>Nouveau module</h4>

                          <label>
                            Titre du module *
                            <input
                              type="text"
                              value={moduleEnCours.titreModule}
                              onChange={(event) =>
                                setModuleEnCours((previous) => ({
                                  ...previous,
                                  titreModule: event.target.value
                                }))
                              }
                              placeholder="Ex : Introduction à React"
                              required
                            />
                          </label>

                          <label>
                            Description
                            <textarea
                              value={moduleEnCours.descriptionModule}
                              onChange={(event) =>
                                setModuleEnCours((previous) => ({
                                  ...previous,
                                  descriptionModule: event.target.value
                                }))
                              }
                              placeholder="Décrivez le contenu de ce module..."
                              rows={2}
                            />
                          </label>

                          <div className={styles.formGrid}>
                            <label>
                              Ordre du module *
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={moduleEnCours.ordre}
                                onChange={(event) =>
                                  setModuleEnCours((previous) => ({
                                    ...previous,
                                    ordre: event.target.value
                                  }))
                                }
                                required
                              />
                            </label>

                            <label>
                              Type de contenu *
                              <select
                                value={moduleEnCours.typeContenu}
                                onChange={(event) =>
                                  setModuleEnCours((previous) => ({
                                    ...previous,
                                    typeContenu: event.target.value
                                  }))
                                }
                              >
                                <option value="video">Vidéo</option>
                                <option value="pdf">PDF</option>
                                <option value="lien">Lien externe</option>
                              </select>
                            </label>
                          </div>

                          <label>
                            {moduleEnCours.typeContenu === "video"
                              ? "Lien de la vidéo *"
                              : moduleEnCours.typeContenu === "pdf"
                              ? "Lien du PDF *"
                              : "Lien externe *"}

                            <input
                              type="url"
                              value={moduleEnCours.contenu}
                              onChange={(event) =>
                                setModuleEnCours((previous) => ({
                                  ...previous,
                                  contenu: event.target.value
                                }))
                              }
                              placeholder={
                                moduleEnCours.typeContenu === "video"
                                  ? "https://www.youtube.com/watch?v=..."
                                  : moduleEnCours.typeContenu === "pdf"
                                  ? "https://exemple.com/document.pdf"
                                  : "https://exemple.com"
                              }
                              required
                            />
                          </label>

                          <div className={styles.formActions}>
                            <button
                              type="button"
                              className={styles.cancelButton}
                              onClick={() =>
                                setFormationSelectionnee(null)
                              }
                            >
                              Annuler
                            </button>

                            <button
                              type="submit"
                              className={styles.primaryButton}
                              disabled={creationModule}
                            >
                              {creationModule
                                ? "Ajout..."
                                : "Ajouter le module"}
                            </button>
                          </div>
                        </form>
                      )}

                      {modulesFormation.length > 0 ? (
                        <div className={styles.lessonList}>
                          {modulesFormation.map((module, index) => (
                            <div
                              className={styles.lessonItem}
                              key={module.codeModule}
                            >
                              <div className={styles.lessonNumber}>
                                {module.ordre || index + 1}
                              </div>

                              <div className={styles.lessonInfo}>
                                <strong>{module.titreModule}</strong>
                                <span>
                                  {module.descriptionModule ||
                                    "Aucune description"}
                                </span>
                                <span>
                                  Type : {obtenirTypeContenu(module)}
                                </span>
                              </div>

                              <Link
                                href={`/dashboard/formateur/modules/modifier?id=${module.codeModule}`}
                                className={styles.manageLink}
                              >
                                Modifier
                              </Link>

                              <button
                                type="button"
                                className={styles.deleteLessonButton}
                                onClick={() =>
                                  supprimerModule(module.codeModule)
                                }
                              >
                                Supprimer
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.noLessons}>
                          Aucun module dans cette formation.
                          Ajoutez votre premier module pour commencer.
                        </div>
                      )}

                      <div className={styles.formationFooter}>
                        <Link
                          href="/dashboard/formateur/modules"
                          className={styles.manageLink}
                        >
                          Gérer tous les modules →
                        </Link>

                        <button
                          type="button"
                          className={styles.deleteFormationButton}
                          onClick={() =>
                            supprimerFormation(formation.numFormation)
                          }
                        >
                          Supprimer la formation
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <footer className={styles.footer}>
            <span>Learning Pro</span>
            <span>
              Votre espace de formation et d&apos;apprentissage
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}