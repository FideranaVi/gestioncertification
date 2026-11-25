"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./certificats.module.css";
import { obtenirApiFormateur } from "@/lib/api";

const API = obtenirApiFormateur();

// FIX : le backend renvoie parfois id, parfois idCertificat
// Sans ça, on envoyait /certificats/undefined/valider
// -> "Identifiant de certificat invalide"
const getIdCertificat = (item) => {
  if (!item) return null;
  return item.idCertificat ?? item.id ?? item.id_certificat ?? null;
};

export default function CertificatsFormateurPage() {
  const router = useRouter();
  const [certificats, setCertificats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [traitement, setTraitement] = useState(null);
  const [filtre, setFiltre] = useState("tous");

  useEffect(() => {
    const timer = setTimeout(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        setErreur("Session expiree. Veuillez vous reconnecter.");
        setChargement(false);
        return;
      }
      fetch(API + "/certificats/formateur", {
        headers: { Authorization: "Bearer " + token },
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "Impossible de charger les certificats.");
          return data;
        })
        .then((data) => {
          if (Array.isArray(data.certificats)) setCertificats(data.certificats);
          else if (Array.isArray(data)) setCertificats(data);
          else setCertificats([]);
          setChargement(false);
        })
        .catch((error) => {
          setErreur(error.message);
          setChargement(false);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const recharger = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErreur("Session expiree. Veuillez vous reconnecter.");
      return;
    }
    setChargement(true);
    setErreur("");
    fetch(API + "/certificats/formateur", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Impossible de charger les certificats.");
        return data;
      })
      .then((data) => {
        if (Array.isArray(data.certificats)) setCertificats(data.certificats);
        else if (Array.isArray(data)) setCertificats(data);
        else setCertificats([]);
        setChargement(false);
      })
      .catch((error) => {
        setErreur(error.message);
        setChargement(false);
      });
  };

  const formaterDate = (date) => {
    if (!date) return "Date non disponible";
    const valeur = new Date(date);
    if (Number.isNaN(valeur.getTime())) return "Date non disponible";
    return valeur.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const obtenirTitre = (item) => {
    if (item.formation && item.formation.titre) return item.formation.titre;
    if (item.Formation && item.Formation.titre) return item.Formation.titre;
    if (item.titreFormation) return item.titreFormation;
    return "Formation " + (item.numFormation || "");
  };

  const obtenirNomComplet = (utilisateur) => {
    if (!utilisateur) return "Non renseigne";
    const nom = (utilisateur.nom || "").trim().toUpperCase();
    let prenom = (utilisateur.prenom || "").trim();
    if (prenom) prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    const complet = [nom, prenom].filter(Boolean).join(" ");
    return complet || "Non renseigne";
  };

  const obtenirStatut = (item) => item.statutCertificat || "en_attente";

  const obtenirLibelleStatut = (statut) => {
    if (statut === "validee") return "Valide";
    if (statut === "annulee") return "Refuse";
    return "En attente";
  };

  const traiterCertificat = (idCertificat, decision) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setErreur("Session expiree. Veuillez vous reconnecter.");
      return;
    }
    // FIX : on n'appelle jamais le backend avec un id vide
    if (!idCertificat || idCertificat === "undefined") {
      setErreur("Identifiant de certificat invalide. Recharge la page.");
      return;
    }
    setTraitement(idCertificat);
    setErreur("");
    setSucces("");
    fetch(API + "/certificats/" + encodeURIComponent(idCertificat) + "/valider", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decision: decision }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Impossible de traiter le certificat.");
        return data;
      })
      .then((data) => {
        setSucces(
          data.message ||
            (decision === "valider" ? "Certificat valide." : "Certificat refuse.")
        );
        setCertificats((anciens) =>
          anciens.map((item) => {
            if (getIdCertificat(item) === idCertificat) {
              return Object.assign({}, item, {
                statutCertificat: decision === "valider" ? "validee" : "annulee",
              });
            }
            return item;
          })
        );
        setTraitement(null);
      })
      .catch((error) => {
        setErreur(error.message);
        setTraitement(null);
      });
  };

  const certificatsFiltres = certificats.filter((item) => {
    if (filtre === "tous") return true;
    return obtenirStatut(item) === filtre;
  });

  const nbEnAttente = certificats.filter((i) => obtenirStatut(i) === "en_attente").length;
  const nbValides = certificats.filter((i) => obtenirStatut(i) === "validee").length;
  const nbRefuses = certificats.filter((i) => obtenirStatut(i) === "annulee").length;

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <h3>Chargement des demandes</h3>
          <p>Nous recuperons les demandes de certificats...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* ===== NAV HAUT : juste Retour ===== */}
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/dashboard/formateur")}
        >
          ← Retour
        </button>
        <span className={styles.pageTitle}>Certificats</span>
        <span className={styles.topBarSpacer} />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>LEARNING PRO / ESPACE FORMATEUR</span>
            <h1>
              Demandes de <span>certificats</span>
            </h1>
            <p>Validez ou refusez les demandes de vos apprenants. Vous seul decidez.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={recharger}>
            Actualiser
          </button>
        </header>

        {erreur && (
          <div className={styles.error}>
            <span>!</span>
            {erreur}
          </div>
        )}
        {succes && (
          <div className={styles.success}>
            <span>OK</span>
            {succes}
          </div>
        )}

        <section className={styles.summary}>
          <div className={styles.summaryStat}>
            <span>En attente</span>
            <strong>{nbEnAttente}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>Valides</span>
            <strong>{nbValides}</strong>
          </div>
          <div className={styles.summaryStat}>
            <span>Refuses</span>
            <strong>{nbRefuses}</strong>
          </div>
        </section>

        <div className={styles.filters}>
          <button
            type="button"
            className={filtre === "tous" ? styles.filterActive : styles.filterButton}
            onClick={() => setFiltre("tous")}
          >
            Tous ({certificats.length})
          </button>
          <button
            type="button"
            className={filtre === "en_attente" ? styles.filterActive : styles.filterButton}
            onClick={() => setFiltre("en_attente")}
          >
            En attente ({nbEnAttente})
          </button>
          <button
            type="button"
            className={filtre === "validee" ? styles.filterActive : styles.filterButton}
            onClick={() => setFiltre("validee")}
          >
            Valides ({nbValides})
          </button>
          <button
            type="button"
            className={filtre === "annulee" ? styles.filterActive : styles.filterButton}
            onClick={() => setFiltre("annulee")}
          >
            Refuses ({nbRefuses})
          </button>
        </div>

        {certificatsFiltres.length === 0 ? (
          <div className={styles.empty}>
            <h3>Aucune demande pour ce filtre</h3>
            <p>Aucun apprenant n a encore demande de certificat ici.</p>
          </div>
        ) : (
          <div className={styles.certificateGrid}>
            {certificatsFiltres.map((item, index) => {
              const idCertificat = getIdCertificat(item);
              const titre = obtenirTitre(item);
              const nomApprenant = obtenirNomComplet(
                item.apprenant || item.Apprenant || item.utilisateur
              );
              const statut = obtenirStatut(item);
              const enCours = traitement === idCertificat;
              return (
                <article
                  className={styles.certificateCard}
                  key={idCertificat || index}
                >
                  <div className={styles.certificateInfo}>
                    <div className={styles.cardHeader}>
                      <div>
                        <span className={styles.label}>CERTIFICATION</span>
                        <h3>{titre}</h3>
                      </div>
                      <span
                        className={`${styles.verifiedBadge} ${
                          statut === "validee"
                            ? styles.badgeValide
                            : statut === "annulee"
                            ? styles.badgeRefuse
                            : styles.badgeAttente
                        }`}
                      >
                        {obtenirLibelleStatut(statut)}
                      </span>
                    </div>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>APPRENANT</span>
                        <strong>{nomApprenant}</strong>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>DATE</span>
                        <strong>{formaterDate(item.dateObtention)}</strong>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.label}>REFERENCE</span>
                        <strong>
                          {item.numeroCertificat || idCertificat || "Non disponible"}
                        </strong>
                      </div>
                    </div>
                    {statut === "en_attente" ? (
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.validateButton}
                          disabled={enCours}
                          onClick={() => traiterCertificat(idCertificat, "valider")}
                        >
                          {enCours ? "Traitement..." : "Valider"}
                        </button>
                        <button
                          type="button"
                          className={styles.refuseButton}
                          disabled={enCours}
                          onClick={() => traiterCertificat(idCertificat, "refuser")}
                        >
                          Refuser
                        </button>
                      </div>
                    ) : (
                      <p className={styles.downloadHint}>
                        {statut === "validee"
                          ? "Ce certificat est valide. L apprenant peut le telecharger."
                          : "Ce certificat a ete refuse. L apprenant ne voit aucun certificat, seulement Reprendre le quiz."}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== NAV BAS : comme une vraie app ===== */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard/formateur" className={styles.bottomNavLink}>
          Tableau de bord
        </Link>
        <Link href="/dashboard/formateur/formations" className={styles.bottomNavLink}>
          Formations
        </Link>
        <Link
          href="/dashboard/formateur/certificats"
          className={`${styles.bottomNavLink} ${styles.bottomNavActive}`}
        >
          Certificats
        </Link>
        <Link href="/dashboard/formateur/profil" className={styles.bottomNavLink}>
          Profil
        </Link>
      </nav>
    </main>
  );
}