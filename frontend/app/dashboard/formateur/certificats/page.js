
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./certificats.module.css";

const API = "http://localhost:5000/api/formateur";

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function formaterDate(date) {
  if (!date) return "—";
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "—";

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function nomComplet(utilisateur) {
  if (!utilisateur) return "Apprenant inconnu";

  return [utilisateur.prenom, utilisateur.nom]
    .filter(Boolean)
    .join(" ") || "Apprenant inconnu";
}

function Icone({ type, size = 20 }) {
  const commun = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  const formes = {
    award: <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.2 13-1.2 9 5-3 5 3-1.2-9" />
    </>,
    search: <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
    cancel: <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-6 6m0-6 6 6" />
    </>,
    refresh: <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" />
    </>,
    file: <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8" />
    </>,
    filter: <>
      <path d="M4 5h16M7 12h10m-7 7h4" />
    </>
  };

  return <svg {...commun}>{formes[type] || formes.file}</svg>;
}

async function recupererCertificats() {
  const token = obtenirToken();

  if (!token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const response = await fetch(`${API}/certificats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Impossible de charger les certificats.");
  }

  const liste = Array.isArray(data)
    ? data
    : data.certificats || data.data || [];

  if (!Array.isArray(liste)) {
    throw new Error("Les données reçues sont invalides.");
  }

  return liste;
}

export default function CertificationsPage() {
  const [certificats, setCertificats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [actionEnCours, setActionEnCours] = useState(null);
  const [message, setMessage] = useState("");

  const chargerCertificats = useCallback(async () => {
    setErreur("");

    try {
      const liste = await recupererCertificats();
      setCertificats(liste);
    } catch (error) {
      setErreur(error.message || "Une erreur est survenue.");
    }
  }, []);

  useEffect(() => {
    let actif = true;

    async function charger() {
      try {
        const liste = await recupererCertificats();

        if (actif) {
          setCertificats(liste);
        }
      } catch (error) {
        if (actif) {
          setErreur(error.message || "Une erreur est survenue.");
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, []);

  const statistiques = useMemo(() => ({
    total: certificats.length,
    valides: certificats.filter(
      item => item.statutCertificat === "validee"
    ).length,
    attente: certificats.filter(
      item => item.statutCertificat === "en_attente"
    ).length,
    annules: certificats.filter(
      item => item.statutCertificat === "annulee"
    ).length
  }), [certificats]);

  const certificatsFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return certificats.filter(certificat => {
      const apprenant = nomComplet(certificat.apprenant);
      const formation = certificat.formation?.titre || "";
      const numero = certificat.numeroCertificat || "";

      const correspondRecherche =
        !terme ||
        apprenant.toLowerCase().includes(terme) ||
        formation.toLowerCase().includes(terme) ||
        numero.toLowerCase().includes(terme);

      const correspondStatut =
        filtreStatut === "tous" ||
        certificat.statutCertificat === filtreStatut;

      return correspondRecherche && correspondStatut;
    });
  }, [certificats, recherche, filtreStatut]);

  async function actualiser() {
    setChargement(true);
    setMessage("");
    setErreur("");

    try {
      const liste = await recupererCertificats();
      setCertificats(liste);
    } catch (error) {
      setErreur(error.message || "Une erreur est survenue.");
    } finally {
      setChargement(false);
    }
  }

  async function modifierStatut(certificat, statut) {
    const confirmation = window.confirm(
      statut === "validee"
        ? "Voulez-vous valider ce certificat ? L'apprenant pourra accéder à son certificat si le backend autorise son téléchargement."
        : "Voulez-vous annuler ce certificat ?"
    );

    if (!confirmation) return;

    setActionEnCours(certificat.idCertificat);
    setMessage("");
    setErreur("");

    try {
      const token = obtenirToken();

      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${API}/certificats/${certificat.idCertificat}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ statutCertificat: statut })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "La modification a échoué.");
      }

      setMessage(
        statut === "validee"
          ? "Le certificat a été validé."
          : "Le certificat a été annulé."
      );

      await chargerCertificats();
    } catch (error) {
      setErreur(error.message || "Impossible de modifier le certificat.");
    } finally {
      setActionEnCours(null);
    }
  }

  function libelleStatut(statut) {
    if (statut === "validee") return "Validé";
    if (statut === "en_attente") return "En attente";
    if (statut === "annulee") return "Annulé";
    return statut || "Inconnu";
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.surtitre}>
            <span className={styles.surtitrePoint} />
            ESPACE FORMATEUR
          </div>

          <h1>Certifications</h1>

          <p>
            Consultez et gérez les certificats des apprenants
            de vos formations.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={actualiser}
          disabled={chargement}
        >
          <Icone type="refresh" size={17} />
          <span>Actualiser</span>
        </button>
      </header>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Icone type="award" size={22} />
          </div>

          <div className={styles.statInfo}>
            <span>Total certificats</span>
            <strong>{statistiques.total}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <Icone type="check" size={22} />
          </div>

          <div className={styles.statInfo}>
            <span>Certificats validés</span>
            <strong>{statistiques.valides}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orange}`}>
            <Icone type="clock" size={22} />
          </div>

          <div className={styles.statInfo}>
            <span>En attente</span>
            <strong>{statistiques.attente}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.red}`}>
            <Icone type="cancel" size={22} />
          </div>

          <div className={styles.statInfo}>
            <span>Certificats annulés</span>
            <strong>{statistiques.annules}</strong>
          </div>
        </article>
      </section>

      {message && (
        <div className={styles.successMessage}>
          <Icone type="check" size={18} />
          <span>{message}</span>
        </div>
      )}

      {erreur && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>!</span>
          <span>{erreur}</span>
        </div>
      )}

      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>Liste des certificats</h2>
            <p>
              Retrouvez les certificats et gérez leur validation.
            </p>
          </div>

          <span className={styles.resultCount}>
            {certificatsFiltres.length} résultat(s)
          </span>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Icone type="search" size={19} />

            <input
              type="search"
              placeholder="Rechercher un apprenant, une formation..."
              value={recherche}
              onChange={event => setRecherche(event.target.value)}
            />

            {recherche && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setRecherche("")}
                aria-label="Effacer la recherche"
              >
                ×
              </button>
            )}
          </div>

          <div className={styles.selectBox}>
            <Icone type="filter" size={18} />

            <select
              value={filtreStatut}
              onChange={event => setFiltreStatut(event.target.value)}
            >
              <option value="tous">Tous les statuts</option>
              <option value="validee">Validés</option>
              <option value="en_attente">En attente</option>
              <option value="annulee">Annulés</option>
            </select>
          </div>
        </div>

        {chargement ? (
          <div className={styles.state}>
            <div className={styles.loader} />
            <p>Chargement des certificats...</p>
          </div>
        ) : certificatsFiltres.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Icone type="file" size={30} />
            </div>

            <h3>Aucun certificat trouvé</h3>

            <p>
              {recherche || filtreStatut !== "tous"
                ? "Essayez de modifier votre recherche ou votre filtre."
                : "Les certificats des apprenants apparaîtront ici."}
            </p>

            {(recherche || filtreStatut !== "tous") && (
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                  setRecherche("");
                  setFiltreStatut("tous");
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>N° CERTIFICAT</th>
                  <th>APPRENANT</th>
                  <th>FORMATION</th>
                  <th>DATE D&apos;OBTENTION</th>
                  <th>STATUT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {certificatsFiltres.map(certificat => (
                  <tr key={certificat.idCertificat}>
                    <td>
                      <span className={styles.numero}>
                        {certificat.numeroCertificat || "—"}
                      </span>
                    </td>

                    <td>
                      <div className={styles.person}>
                        <div className={styles.avatar}>
                          {nomComplet(certificat.apprenant)
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className={styles.personInfo}>
                          <span className={styles.personName}>
                            {nomComplet(certificat.apprenant)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.formationName}>
                        {certificat.formation?.titre || "Formation inconnue"}
                      </span>
                    </td>

                    <td>
                      <span className={styles.date}>
                        {formaterDate(certificat.dateObtention)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.status} ${
                          certificat.statutCertificat === "validee"
                            ? styles.statusValid
                            : certificat.statutCertificat === "en_attente"
                              ? styles.statusPending
                              : styles.statusCancelled
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {libelleStatut(certificat.statutCertificat)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actions}>
                        {certificat.statutCertificat !== "validee" && (
                          <button
                            type="button"
                            className={styles.validateButton}
                            disabled={
                              actionEnCours === certificat.idCertificat
                            }
                            onClick={() =>
                              modifierStatut(certificat, "validee")
                            }
                          >
                            <Icone type="check" size={15} />
                            <span>
                              {actionEnCours === certificat.idCertificat
                                ? "..."
                                : "Valider"}
                            </span>
                          </button>
                        )}

                        {certificat.statutCertificat !== "annulee" && (
                          <button
                            type="button"
                            className={styles.cancelButton}
                            disabled={
                              actionEnCours === certificat.idCertificat
                            }
                            onClick={() =>
                              modifierStatut(certificat, "annulee")
                            }
                          >
                            <Icone type="cancel" size={15} />
                            <span>Annuler</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <Icone type="file" size={16} />
        <span>
          La validation du certificat autorise l&apos;accès au
          téléchargement selon les règles du serveur.
        </span>
      </footer>
    </main>
  );
}
