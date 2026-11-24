"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./tentatives.module.css";

// ✅ CORRIGÉ : UNE SEULE API, celle du formateur
// On ne touche plus jamais à /api/certificats depuis cette page
const API = "http://localhost:5000/api/formateur";
const ACTUALISATION_MS = 5000;
const DELAI_INACTIVITE_MS = 30000;

function obtenirToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function dateLisible(date) {
  if (!date) return "Non disponible";

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "Non disponible";
  }

  return valeur.toLocaleString("fr-FR");
}

function dureeLisible(secondes) {
  const total = Math.max(0, Number(secondes || 0));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);

  if (heures > 0) return `${heures} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${secs} s`;

  return `${secs} s`;
}

function obtenirDateActivite(tentative) {
  return tentative.derniereActivite || tentative.dateTentative || null;
}

function signalActiviteAncien(tentative, maintenant = Date.now()) {
  if (
    tentative.statut !== "en_cours" ||
    !tentative.derniereActivite
  ) {
    return false;
  }

  const date = new Date(tentative.derniereActivite).getTime();

  if (Number.isNaN(date)) return false;

  return maintenant - date > DELAI_INACTIVITE_MS;
}

function statutTentative(tentative, maintenant = Date.now()) {
  const statut = String(tentative.statut || "").toLowerCase();

  if (statut === "terminee" || statut === "terminée") {
    return "terminee";
  }

  if (statut === "abandonnee" || statut === "abandonnée") {
    return "abandonnee";
  }

  if (statut !== "en_cours") {
    return "en_cours";
  }

  if (tentative.horsEcran) return "hors_ecran";

  if (signalActiviteAncien(tentative, maintenant)) {
    return "signal_inactif";
  }

  return "en_cours";
}

function statutTexte(statut) {
  switch (statut) {
    case "terminee":
      return "Terminée";
    case "hors_ecran":
      return "Hors écran";
    case "signal_inactif":
      return "Signal ancien";
    case "abandonnee":
      return "Abandonnée";
    default:
      return "En cours";
  }
}

function filtrerTentative(tentative, filtre, maintenant) {
  const statut = statutTentative(tentative, maintenant);

  if (filtre === "toutes") return true;
  if (filtre === "en_cours") return statut === "en_cours";
  if (filtre === "hors_ecran") return statut === "hors_ecran";
  if (filtre === "signal_inactif") return statut === "signal_inactif";
  if (filtre === "terminee") return statut === "terminee";
  if (filtre === "abandonnee") return statut === "abandonnee";

  if (filtre === "avec_sorties") {
    return Number(tentative.nbSorties || 0) > 0;
  }

  return true;
}

function nomApprenant(tentative) {
  const apprenant = tentative.apprenant;

  if (!apprenant) {
    return `Apprenant #${tentative.idApprenant || "?"}`;
  }

  return (
    `${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim() ||
    `Apprenant #${tentative.idApprenant}`
  );
}

function obtenirScore(tentative) {
  if (
    tentative.evaluation?.score !== undefined &&
    tentative.evaluation?.score !== null
  ) {
    return Number(tentative.evaluation.score);
  }

  if (tentative.score !== undefined && tentative.score !== null) {
    return Number(tentative.score);
  }

  return null;
}

function resultatEvaluation(tentative) {
  const resultat =
    tentative.evaluation?.resultat || tentative.resultat || "";

  return String(resultat).toLowerCase();
}

// ✅ CORRIGÉ : lit le VRAI champ statutCertificat + toutes les variantes
// Normalise tout vers : valide | refuse | en_attente
function statutCertificat(tentative) {
  const certificat = tentative.certificat || {};

  const statut = String(
    certificat.statutCertificat ||
    certificat.statutValidation ||
    certificat.statut ||
    tentative.statutCertificat ||
    tentative.certificatStatut ||
    ""
  ).toLowerCase();

  if (
    [
      "valide",
      "validé",
      "validee",
      "validée"
    ].includes(statut)
  ) {
    return "valide";
  }

  if (
    [
      "refuse",
      "refusé",
      "refusee",
      "refusée",
      "annule",
      "annulé",
      "annulee",
      "annulée"
    ].includes(statut)
  ) {
    return "refuse";
  }

  return "en_attente";
}

// ✅ Récupère l'id du certificat quelle que soit la forme renvoyée par le backend
// Sert UNIQUEMENT à l'afficher en debug, plus jamais à appeler /api/certificats
function obtenirIdCertificat(tentative) {
  return (
    tentative.certificat?.idCertificat ||
    tentative.certificat?.id ||
    tentative.idCertificat ||
    tentative.certificatId ||
    null
  );
}

function typeActiviteTexte(type) {
  const libelles = {
    sortie_onglet: "Sortie de l'onglet",
    sortie_fenetre: "Sortie de la fenêtre",
    page_quittee: "Page quittée",
    retour: "Retour sur la page"
  };

  return libelles[type] || type || "Activité";
}

function obtenirClasseStatut(statut) {
  switch (statut) {
    case "terminee":
      return styles.terminee;
    case "hors_ecran":
      return styles.hors_ecran;
    case "signal_inactif":
      return styles.signal_inactif || styles.hors_ecran;
    case "abandonnee":
      return styles.abandonnee;
    default:
      return styles.en_cours;
  }
}

export default function TentativesFormateurPage() {
  const [tentatives, setTentatives] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [formationSelectionnee, setFormationSelectionnee] = useState("toutes");
  const [detailsOuverts, setDetailsOuverts] = useState({});
  const [actualisation, setActualisation] = useState(null);
  const [maintenant, setMaintenant] = useState(0);
  const [validationsEnCours, setValidationsEnCours] = useState({});
  const [messagesValidation, setMessagesValidation] = useState({});

  const requeteEnCours = useRef(false);
  const pageActive = useRef(true);
  const validationEnCoursRef = useRef(false);

  // ✅ CORRIGÉ : chargerTentatives peut être forcée (force = true)
  // Avant, après le clic Valider, le refetch était bloqué par requeteEnCours
  // et l'écran gardait l'ancienne valeur en_attente
  const chargerTentatives = useCallback(async (force = false) => {
    if (requeteEnCours.current && !force) return;

    // ✅ Pendant une validation, on ne laisse pas le refresh auto écraser l'état
    if (validationEnCoursRef.current && !force) return;

    requeteEnCours.current = true;

    const token = obtenirToken();

    if (!token) {
      window.location.href = "/connexion";
      requeteEnCours.current = false;
      return null;
    }

    try {
      const response = await fetch(`${API}/tentatives`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        cache: "no-store"
      });

      const donnees = await response.json().catch(() => ({}));

      if (!pageActive.current) return null;

      if (response.status === 401 || response.status === 403) {
        window.location.href = "/connexion";
        return null;
      }

      if (!response.ok) {
        throw new Error(
          donnees.message ||
          "Impossible de récupérer les résultats des apprenants."
        );
      }

      const liste = Array.isArray(donnees.tentatives)
        ? donnees.tentatives
        : [];

      setTentatives(liste);
      setErreur("");
      setActualisation(new Date());

      return liste;
    } catch (error) {
      if (pageActive.current) {
        setErreur(
          error.message ||
          "Erreur de récupération des tentatives."
        );
      }
      return null;
    } finally {
      requeteEnCours.current = false;

      if (pageActive.current) {
        setChargement(false);
      }
    }
  }, []);

  useEffect(() => {
    pageActive.current = true;

    const premierChargement = setTimeout(() => {
      chargerTentatives(true);
    }, 0);

    const intervalle = setInterval(() => {
      chargerTentatives();
    }, ACTUALISATION_MS);

    const intervalleHorloge = setInterval(() => {
      setMaintenant(Date.now());
    }, 1000);

    return () => {
      pageActive.current = false;
      clearTimeout(premierChargement);
      clearInterval(intervalle);
      clearInterval(intervalleHorloge);
    };
  }, [chargerTentatives]);

  const formations = useMemo(() => {
    const map = new Map();

    tentatives.forEach((tentative) => {
      if (tentative.formation?.numFormation) {
        map.set(
          Number(tentative.formation.numFormation),
          tentative.formation.titre || "Formation sans titre"
        );
      }
    });

    return Array.from(map.entries()).map(([id, titre]) => ({
      id: String(id),
      titre
    }));
  }, [tentatives]);

  const statistiques = useMemo(() => {
    const total = tentatives.length;

    const enCours = tentatives.filter(
      (t) => statutTentative(t, maintenant) === "en_cours"
    ).length;

    const horsEcran = tentatives.filter(
      (t) => statutTentative(t, maintenant) === "hors_ecran"
    ).length;

    const signalInactif = tentatives.filter(
      (t) => statutTentative(t, maintenant) === "signal_inactif"
    ).length;

    const terminees = tentatives.filter(
      (t) => statutTentative(t, maintenant) === "terminee"
    ).length;

    const abandonnees = tentatives.filter(
      (t) => statutTentative(t, maintenant) === "abandonnee"
    ).length;

    const sorties = tentatives.reduce(
      (totalSorties, t) =>
        totalSorties + Number(t.nbSorties || 0),
      0
    );

    return {
      total,
      enCours,
      horsEcran,
      signalInactif,
      terminees,
      abandonnees,
      sorties
    };
  }, [tentatives, maintenant]);

  const tentativesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return tentatives.filter((tentative) => {
      if (!filtrerTentative(tentative, filtre, maintenant)) {
        return false;
      }

      if (
        formationSelectionnee !== "toutes" &&
        Number(tentative.formation?.numFormation) !==
          Number(formationSelectionnee)
      ) {
        return false;
      }

      if (!terme) return true;

      const textes = [
        nomApprenant(tentative),
        tentative.apprenant?.email,
        tentative.quiz?.nomQuiz,
        tentative.formation?.titre,
        tentative.moduleInfo?.titreModule,
        tentative.statut
      ];

      return textes.some((texte) =>
        String(texte || "").toLowerCase().includes(terme)
      );
    });
  }, [tentatives, recherche, filtre, formationSelectionnee, maintenant]);

  // ✅ REFAIT COMPLÈTEMENT : 1 seule route + vérification en base
  // Avant : 2 routes + succès affiché sans vérification
  // Maintenant : PATCH formateur -> re-GET tentatives -> on ne dit "Validé"
  // que si la base renvoie vraiment validee. Sinon on affiche l'erreur réelle.
  const traiterValidationCertificat = async (tentative, decision) => {
    const id = tentative.idTentative;

    if (!id || validationsEnCours[id]) return;

    const token = obtenirToken();

    if (!token) {
      window.location.href = "/connexion";
      return;
    }

    const confirmation =
      decision === "valider"
        ? "Confirmer la validation du certificat de cet apprenant ?"
        : "Confirmer le refus du certificat de cet apprenant ?";

    if (!window.confirm(confirmation)) return;

    // ✅ Bloque le refresh auto pendant la validation
    validationEnCoursRef.current = true;

    setValidationsEnCours((precedent) => ({
      ...precedent,
      [id]: true
    }));

    setMessagesValidation((precedent) => ({
      ...precedent,
      [id]: ""
    }));

    try {
      // ✅ ÉTAPE 1 : UNE SEULE ROUTE, toujours la même
      // PATCH /api/formateur/tentatives/:id/certificat
      // body : { decision: "valider" | "refuser" }
      // Le backend crée le certificat s'il n'existe pas, puis valide / refuse
      // On n'appelle PLUS /api/certificats/:id/statut
      const response = await fetch(
        `${API}/tentatives/${id}/certificat`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ decision })
        }
      );

      const donnees = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        window.location.href = "/connexion";
        return;
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Route introuvable (404). Vérifie que formateurRoutes.js contient bien : router.patch(\"/tentatives/:id/certificat\", tentativeQuizController.validerCertificatTentative)"
          );
        }
        if (response.status === 409) {
          throw new Error("Cette demande a déjà été traitée.");
        }
        if (response.status === 400) {
          throw new Error(
            donnees.message ||
            "L'apprenant n'a pas encore réussi cette évaluation."
          );
        }
        throw new Error(
          donnees.message || "Impossible de traiter le certificat."
        );
      }

      // ✅ ÉTAPE 2 : VÉRIFICATION EN BASE - on re-lit les tentatives
      // On n'affiche JAMAIS "Validé" sur la seule base de la réponse PATCH
      const listeApres = await chargerTentatives(true);

      const tentativeApres = (listeApres || []).find(
        (t) => Number(t.idTentative) === Number(id)
      );

      const statutApres = tentativeApres
        ? statutCertificat(tentativeApres)
        : "en_attente";

      const attendu = decision === "valider" ? "valide" : "refuse";

      // ✅ ÉTAPE 3 : si la base n'a pas bougé, on ne ment pas à l'utilisateur
      if (statutApres !== attendu) {
        throw new Error(
          `Le backend a répondu OK mais la base est toujours en "${statutApres}". ` +
          `La validation n'a pas été enregistrée. Vérifie que validerCertificatTentative fait bien certificat.save() / update et que la route n'est pas doublée dans formateurRoutes.js.`
        );
      }

      setMessagesValidation((precedent) => ({
        ...precedent,
        [id]:
          donnees.message ||
          (decision === "valider"
            ? "Certificat validé avec succès. L'apprenant peut maintenant le télécharger."
            : "Certificat refusé.")
      }));
    } catch (error) {
      // ✅ En cas d'erreur, on recharge quand même pour revenir à l'état réel de la base
      // et ne pas laisser un faux badge "Validé" affiché
      await chargerTentatives(true);

      setMessagesValidation((precedent) => ({
        ...precedent,
        [id]: error.message || "Une erreur est survenue."
      }));
    } finally {
      validationEnCoursRef.current = false;

      setValidationsEnCours((precedent) => ({
        ...precedent,
        [id]: false
      }));
    }
  };

  const toggleDetails = (id) => {
    setDetailsOuverts((precedent) => ({
      ...precedent,
      [id]: !precedent[id]
    }));
  };

  const recharger = () => {
    setChargement(true);
    chargerTentatives(true);
  };

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
        <div>
          <Link href="/dashboard/formateur" className={styles.retour}>
            ← Dashboard
          </Link>

          <h1>Suivi des tentatives</h1>

          <p className={styles.sousTitre}>
            Suivez les résultats et les activités enregistrées
            pendant les évaluations.
          </p>
        </div>

        <button
          type="button"
          className={styles.boutonActualiser}
          onClick={recharger}
          disabled={chargement}
        >
          ↻ {chargement ? "Actualisation..." : "Actualiser"}
        </button>
      </header>

      {erreur && (
        <div className={styles.erreur}>
          <strong>Erreur :</strong> {erreur}
          <button type="button" onClick={recharger}>
            Réessayer
          </button>
        </div>
      )}

      <div className={styles.statistiques}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total tentatives</span>
          <strong>{statistiques.total}</strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>En cours</span>
          <strong className={styles.statEnCours}>
            {statistiques.enCours}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Hors écran</span>
          <strong className={styles.statHorsEcran}>
            {statistiques.horsEcran}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Signal ancien</span>
          <strong>{statistiques.signalInactif}</strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Terminées</span>
          <strong className={styles.statTerminees}>
            {statistiques.terminees}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Abandonnées</span>
          <strong className={styles.abandonnees}>
            {statistiques.abandonnees}
          </strong>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Sorties enregistrées</span>
          <strong className={styles.statSorties}>
            {statistiques.sorties}
          </strong>
        </div>
      </div>

      <section className={styles.filtres}>
        <div className={styles.filtreRecherche}>
          <label htmlFor="recherche">Rechercher</label>
          <input
            id="recherche"
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Apprenant, quiz, formation..."
          />
        </div>

        <div className={styles.filtreFormation}>
          <label htmlFor="formation">Formation</label>
          <select
            id="formation"
            value={formationSelectionnee}
            onChange={(e) => setFormationSelectionnee(e.target.value)}
          >
            <option value="toutes">Toutes les formations</option>

            {formations.map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.titre}
              </option>
            ))}
          </select>
        </div>
      </section>

      <nav className={styles.filtresStatut}>
        {[
          ["toutes", "Toutes"],
          ["en_cours", "En cours"],
          ["hors_ecran", "Hors écran"],
          ["signal_inactif", "Signal ancien"],
          ["terminee", "Terminées"],
          ["abandonnee", "Abandonnées"],
          ["avec_sorties", "Avec sorties"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              filtre === value
                ? styles.filtreActif
                : styles.filtreBouton
            }
            onClick={() => setFiltre(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className={styles.infoActualisation}>
        <span className={styles.pointLive}></span>
        Actualisation automatique toutes les 5 secondes

        {actualisation && (
          <span className={styles.dateActualisation}>
            Dernière mise à jour : {dateLisible(actualisation)}
          </span>
        )}
      </div>

      <p className={styles.sousTitre}>
        Le signal ancien indique une absence d&apos;activité enregistrée
        depuis plus de 30 secondes. Ce n&apos;est pas une preuve de
        déconnexion.
      </p>

      <section className={styles.liste}>
        {tentativesFiltrees.length === 0 ? (
          <div className={styles.vide}>
            <h3>Aucune tentative trouvée</h3>
            <p>
              Les tentatives des apprenants apparaîtront ici
              dès qu&apos;ils commenceront un quiz.
            </p>
          </div>
        ) : (
          tentativesFiltrees.map((tentative) => {
            const id = tentative.idTentative;
            const statut = statutTentative(tentative, maintenant);
            const score = obtenirScore(tentative);
            const resultat = resultatEvaluation(tentative);
            const certificatStatut = statutCertificat(tentative);
            const ouvert = Boolean(detailsOuverts[id]);

            const activites = Array.isArray(tentative.activites)
              ? tentative.activites
              : [];

            const nbQuestions = Number(tentative.nbQuestions || 0);
            const nbReponses = Number(tentative.nbReponses || 0);

            const progression = Math.max(
              0,
              Math.min(100, Number(tentative.progression || 0))
            );

            const sorties = Number(tentative.nbSorties || 0);
            const tempsHorsEcran = Number(
              tentative.tempsHorsEcran || 0
            );

            const reussie =
              resultat === "reussi" ||
              resultat === "réussi" ||
              resultat === "reussie" ||
              resultat === "réussie";

            return (
              <article className={styles.tentativeCard} key={id}>
                <div className={styles.cardHeader}>
                  <div className={styles.identite}>
                    <div className={styles.avatar}>
                      {nomApprenant(tentative)
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3>{nomApprenant(tentative)}</h3>
                      <p>
                        {tentative.apprenant?.email ||
                          `ID apprenant : ${tentative.idApprenant}`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`${styles.statut} ${obtenirClasseStatut(statut)}`}
                  >
                    {statutTexte(statut)}
                  </span>
                </div>

                {statut === "signal_inactif" && (
                  <div className={styles.alerteSorties}>
                    <strong>Activité récente non détectée</strong>
                    <span>
                      Aucune activité enregistrée depuis plus de 30 secondes.
                      La connexion réelle n&apos;est pas confirmée.
                    </span>
                  </div>
                )}

                {statut === "hors_ecran" && (
                  <div className={styles.alerteSorties}>
                    <strong>Dernier événement : sortie</strong>
                    <span>
                      Le dernier événement indique une sortie.
                      Un retour peut ne pas avoir été transmis.
                    </span>
                  </div>
                )}

                <div className={styles.infosQuiz}>
                  <div>
                    <span className={styles.label}>Quiz</span>
                    <strong>
                      {tentative.quiz?.nomQuiz || "Quiz"}
                    </strong>
                  </div>

                  <div>
                    <span className={styles.label}>Formation</span>
                    <strong>
                      {tentative.formation?.titre ||
                        "Formation non identifiée"}
                    </strong>
                  </div>

                  <div>
                    <span className={styles.label}>Module</span>
                    <strong>
                      {tentative.moduleInfo?.titreModule ||
                        (tentative.quiz?.typeQuiz === "final"
                          ? "Quiz final"
                          : "Non précisé")}
                    </strong>
                  </div>

                  <div>
                    <span className={styles.label}>Début</span>
                    <strong>
                      {dateLisible(tentative.dateTentative)}
                    </strong>
                  </div>
                </div>

                <div className={styles.progressionSection}>
                  <div className={styles.progressionEntete}>
                    <span>Progression des réponses</span>
                    <strong>
                      {nbReponses} / {nbQuestions}
                    </strong>
                  </div>

                  <div className={styles.progressionBarre}>
                    <div
                      className={styles.progressionValeur}
                      style={{ width: `${progression}%` }}
                    ></div>
                  </div>

                  <span className={styles.progressionPourcentage}>
                    {progression} %
                  </span>
                </div>

                <div className={styles.resume}>
                  <div className={styles.resumeItem}>
                    <span>Sorties</span>
                    <strong>{sorties}</strong>
                  </div>

                  <div className={styles.resumeItem}>
                    <span>Temps hors écran</span>
                    <strong>{dureeLisible(tempsHorsEcran)}</strong>
                  </div>

                  <div className={styles.resumeItem}>
                    <span>Score</span>
                    <strong>
                      {score !== null ? `${score} %` : "En attente"}
                    </strong>
                  </div>

                  <div className={styles.resumeItem}>
                    <span>Résultat</span>
                    <strong>
                      {reussie
                        ? "Réussi"
                        : resultat === "echoue" || resultat === "échoué"
                          ? "Échoué"
                          : "En attente"}
                    </strong>
                  </div>
                </div>

                {statut === "terminee" && reussie && (
                  <div className={styles.validationCertificat}>
                    <div className={styles.validationEntete}>
                      <div>
                        <strong>Validation du certificat</strong>
                        <p>
                          L&apos;apprenant a réussi son évaluation.
                          {score !== null && ` Score obtenu : ${score} %.`}
                        </p>
                      </div>

                      {certificatStatut === "valide" && (
                        <span className={styles.certificatValide}>
                          ✓ Certificat validé
                        </span>
                      )}

                      {certificatStatut === "refuse" && (
                        <span className={styles.certificatRefuse}>
                          Certificat refusé
                        </span>
                      )}

                      {certificatStatut === "en_attente" && (
                        <span className={styles.certificatAttente}>
                          En attente de validation
                        </span>
                      )}
                    </div>

                    {certificatStatut === "en_attente" && (
                      <div className={styles.actionsCertificat}>
                        <button
                          type="button"
                          className={styles.boutonValiderCertificat}
                          onClick={() =>
                            traiterValidationCertificat(tentative, "valider")
                          }
                          disabled={Boolean(validationsEnCours[id])}
                        >
                          {validationsEnCours[id]
                            ? "Traitement..."
                            : "✓ Valider le certificat"}
                        </button>

                        <button
                          type="button"
                          className={styles.boutonRefuserCertificat}
                          onClick={() =>
                            traiterValidationCertificat(tentative, "refuser")
                          }
                          disabled={Boolean(validationsEnCours[id])}
                        >
                          Refuser
                        </button>
                      </div>
                    )}

                    {messagesValidation[id] && (
                      <p className={styles.messageValidation}>
                        {messagesValidation[id]}
                      </p>
                    )}
                  </div>
                )}

                {sorties > 0 && (
                  <div className={styles.alerteSorties}>
                    <strong>
                      {sorties} sortie(s) enregistrée(s)
                    </strong>
                    <span>
                      Les changements d&apos;onglet ou de fenêtre
                      figurent dans l&apos;historique.
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.boutonDetails}
                  onClick={() => toggleDetails(id)}
                  aria-expanded={ouvert}
                >
                  {ouvert
                    ? "Masquer les activités ▲"
                    : "Voir les activités ▼"}
                </button>

                {ouvert && (
                  <div className={styles.details}>
                    <h4>Historique des activités</h4>

                    {activites.length === 0 ? (
                      <p className={styles.aucuneActivite}>
                        Aucune activité de surveillance enregistrée.
                      </p>
                    ) : (
                      <div className={styles.timeline}>
                        {activites.map((activite) => (
                          <div
                            className={styles.activite}
                            key={activite.idActivite}
                          >
                            <div
                              className={
                                activite.type === "retour"
                                  ? styles.pointRetour
                                  : styles.pointSortie
                              }
                            ></div>

                            <div className={styles.activiteContenu}>
                              <strong>
                                {typeActiviteTexte(activite.type)}
                              </strong>

                              <span>
                                {dateLisible(activite.dateActivite)}
                              </span>

                              {activite.dureeSecondes !== null &&
                                activite.dureeSecondes !== undefined && (
                                  <span>
                                    Durée :{" "}
                                    {dureeLisible(activite.dureeSecondes)}
                                  </span>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.detailsInformations}>
                      <p>
                        <strong>ID tentative :</strong> {id}
                      </p>

                      <p>
                        <strong>ID quiz :</strong> {tentative.codeQuiz}
                      </p>

                      <p>
                        <strong>Dernière activité enregistrée :</strong>{" "}
                        {dateLisible(obtenirDateActivite(tentative))}
                      </p>

                      <p>
                        <strong>Seuil de réussite :</strong>{" "}
                        {tentative.quiz?.seuilReussite ?? 0} %
                      </p>

                      <p>
                        <strong>Statut en base :</strong>{" "}
                        {tentative.statut || "Non précisé"}
                      </p>

                      <p>
                        <strong>État interprété :</strong>{" "}
                        {statutTexte(statut)}
                      </p>

                      <p>
                        <strong>Statut du certificat :</strong>{" "}
                        {certificatStatut === "valide"
                          ? "Validé"
                          : certificatStatut === "refuse"
                            ? "Refusé"
                            : "En attente"}
                      </p>

                      <p>
                        <strong>ID certificat :</strong>{" "}
                        {obtenirIdCertificat(tentative) || "Aucun - sera créé à la validation"}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}