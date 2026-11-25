"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./certificats.module.css";
import { obtenirApiApprenant } from "@/lib/api";
const API = obtenirApiApprenant();

export default function CertificatsPage() {
  const router = useRouter();

  const [certificats, setCertificats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [telechargement, setTelechargement] = useState(null);

  const chargerCertificats = useCallback(async () => {
    try {
      setErreur("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const response = await fetch(`${API}/certificats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Impossible de charger les certificats."
        );
      }

      setCertificats(
        Array.isArray(data.certificats)
          ? data.certificats
          : Array.isArray(data)
            ? data
            : []
      );
    } catch (error) {
      setErreur(error.message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      chargerCertificats();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [chargerCertificats]);

  const formaterDate = (date) => {
    if (!date) return "Date non disponible";

    const valeur = new Date(date);

    return Number.isNaN(valeur.getTime())
      ? "Date non disponible"
      : valeur.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
  };

  const obtenirTitre = (item) => {
    return (
      item.formation?.titre ||
      item.Formation?.titre ||
      item.titreFormation ||
      item.formationTitre ||
      `Formation ${item.numFormation || ""}`
    );
  };

  const obtenirNomComplet = (utilisateur) => {
    if (!utilisateur) return "Non renseigné";

    return [
      utilisateur.prenom,
      utilisateur.nom
    ].filter(Boolean).join(" ") || "Non renseigné";
  };

  // ✅ CORRIGÉ : par défaut en_attente, jamais validee
  const obtenirStatut = (item) => {
    return item.statutCertificat || "en_attente";
  };

  const obtenirLibelleStatut = (statut) => {
    if (statut === "validee") return "Validé";
    if (statut === "annulee") return "Annulé";
    return "En attente de validation";
  };

  // ✅ CORRIGÉ : bloque le téléchargement si pas validé + vérifie que c'est bien un PDF
  const telechargerCertificat = async (id, statut) => {
    if (statut && statut !== "validee") {
      setSucces("");
      setErreur(
        statut === "annulee"
          ? "Cette demande de certificat a été annulée par le formateur."
          : "Votre certificat doit d'abord être validé par le formateur."
      );
      return;
    }

    try {
      setErreur("");
      setSucces("");
      setTelechargement(id);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${API}/certificats/${id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        let message = "Impossible de télécharger le certificat.";

        try {
          if (contentType.includes("application/json")) {
            const data = await response.json();
            message = data.message || message;
          } else {
            const texte = await response.text();
            if (texte) message = texte;
          }
        } catch {}

        throw new Error(message);
      }

      // Si le backend renvoie du JSON au lieu d'un PDF, c'est une erreur
      if (!contentType.includes("application/pdf")) {
        let message = "Impossible de télécharger le certificat.";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const lien = document.createElement("a");

      lien.href = url;
      lien.download = `Certificat-LearningPro-${id}.pdf`;

      document.body.appendChild(lien);
      lien.click();
      lien.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      setSucces("Votre certificat a été téléchargé avec succès !");
    } catch (error) {
      setErreur(error.message);
    } finally {
      setTelechargement(null);
    }
  };

  const retournerDashboard = () => {
    router.push("/dashboard/apprenant");
  };

  // ✅ Compteurs : seuls les validés comptent comme "obtenus"
  const certificatsValides = certificats.filter(
    (item) => obtenirStatut(item) === "validee"
  );

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <h3>Préparation de vos certifications</h3>
          <p>Nous récupérons vos réussites...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>

        {/* HEADER */}

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>
              LEARNING PRO / ESPACE APPRENANT
            </span>

            <h1>
              Mes <span>certifications</span>
            </h1>

            <p>
              Valorisez vos compétences, retrouvez vos réussites
              et téléchargez vos certificats officiels.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.backButton}
              onClick={retournerDashboard}
            >
              <span>←</span> Tableau de bord
            </button>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={chargerCertificats}
            >
              ↻ Actualiser
            </button>
          </div>
        </header>

        {/* NOTIFICATIONS */}

        {erreur && (
          <div className={styles.error}>
            <span>!</span>
            {erreur}
          </div>
        )}

        {succes && (
          <div className={styles.success}>
            <span>✓</span>
            {succes}
          </div>
        )}

        {/* STATISTICS */}

        <section className={styles.summary}>
          <div className={styles.summaryLeft}>
            <div className={styles.summaryIcon}>
              ✦
            </div>

            <div>
              <span className={styles.summaryLabel}>
                VOTRE PARCOURS DE RÉUSSITE
              </span>

              <h2>
                Chaque compétence mérite d&apos;être célébrée.
              </h2>

              <p>
                Continuez à apprendre, progressez et construisez
                votre avenir professionnel avec LearningPro.
              </p>
            </div>
          </div>

          <div className={styles.summaryStat}>
            <span>Certificats obtenus</span>
            <strong>{certificatsValides.length}</strong>
            <small>Votre réussite en chiffres</small>
          </div>

          <div className={styles.summaryDecoration}>✧</div>
        </section>

        {/* CERTIFICATES */}

        <section className={styles.section}>

          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>
                VOS ACCOMPLISSEMENTS
              </span>

              <h2>Mes réussites</h2>

              <p>
                Retrouvez ici toutes vos certifications LearningPro.
              </p>
            </div>

            <div className={styles.countBadge}>
              {certificats.length} certificat(s)
            </div>
          </div>

          {certificats.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <span>✧</span>
              </div>

              <h3>Votre première certification vous attend !</h3>

              <p>
                Vous n&apos;avez pas encore obtenu de certificat.
                Poursuivez vos formations, réussissez vos évaluations
                et vos certificats apparaîtront automatiquement ici.
              </p>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={retournerDashboard}
              >
                Explorer mon tableau de bord →
              </button>
            </div>
          ) : (
            <div className={styles.certificateGrid}>
              {certificats.map((item, index) => {
                const titre = obtenirTitre(item);

                const nomApprenant = obtenirNomComplet(
                  item.apprenant || item.Apprenant || item.utilisateur
                );

                const nomFormateur = obtenirNomComplet(
                  item.formateur || item.Formateur
                );

                const statut = obtenirStatut(item);

                const enTelechargement =
                  telechargement === item.idCertificat;

                const peutTelecharger = statut === "validee";

                return (
                  <article
                    className={styles.certificateCard}
                    key={item.idCertificat || index}
                  >

                    {/* CERTIFICATE DESIGN */}

                    <div className={styles.certificatePreview}>

                      <div className={styles.certificateBorder}>

                        <div className={styles.previewTop}>
                          <div className={styles.brand}>
                            <span className={styles.brandIcon}>✦</span>

                            <div>
                              <strong>LEARNING PRO</strong>
                              <small>ACADEMY</small>
                            </div>
                          </div>

                          <span className={styles.medal}>✦</span>
                        </div>

                        <div className={styles.previewContent}>
                          <span className={styles.previewEyebrow}>
                            CERTIFICAT OFFICIEL
                          </span>

                          <h3>DE RÉUSSITE</h3>

                          <p>Ce certificat est fièrement décerné à</p>

                          <strong className={styles.studentName}>
                            {nomApprenant}
                          </strong>

                          <div className={styles.goldLine}></div>

                          <p>Pour avoir réussi la formation</p>

                          <h4>{titre}</h4>
                        </div>

                        <div className={styles.previewBottom}>
                          <div>
                            <strong>
                              {formaterDate(item.dateObtention)}
                            </strong>
                            <span>DATE D&apos;OBTENTION</span>
                          </div>

                          <div className={styles.seal}>
                            <span>✓</span>
                            <small>CERTIFIÉ</small>
                          </div>

                          <div>
                            <strong>LEARNING PRO</strong>
                            <span>ORGANISME</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* CERTIFICATE DETAILS */}

                    <div className={styles.certificateInfo}>

                      <div className={styles.cardHeader}>
                        <div>
                          <span className={styles.label}>
                            CERTIFICATION
                          </span>

                          <h3>{titre}</h3>
                        </div>

                        {/* ✅ Badge selon le VRAI statut */}
                        {statut === "validee" ? (
                          <span className={styles.verifiedBadge}>
                            ✓ Validé
                          </span>
                        ) : statut === "annulee" ? (
                          <span className={styles.verifiedBadge}>
                            ✕ Annulé
                          </span>
                        ) : (
                          <span className={styles.verifiedBadge}>
                            ⏳ En attente
                          </span>
                        )}
                      </div>

                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            APPRENANT
                          </span>

                          <strong>{nomApprenant}</strong>
                        </div>

                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            FORMATEUR
                          </span>

                          <strong>{nomFormateur}</strong>
                        </div>

                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            DATE D&apos;OBTENTION
                          </span>

                          <strong>
                            {formaterDate(item.dateObtention)}
                          </strong>
                        </div>

                        <div className={styles.infoItem}>
                          <span className={styles.label}>
                            RÉFÉRENCE
                          </span>

                          <strong>
                            {item.numeroCertificat ||
                              item.idCertificat ||
                              "Non disponible"}
                          </strong>
                        </div>
                      </div>

                      <div className={styles.statusInfo}>
                        Statut : {obtenirLibelleStatut(statut)}
                      </div>

                      {/* ✅ Bouton bloqué si pas validé */}
                      <button
                        type="button"
                        className={styles.downloadButton}
                        onClick={() =>
                          telechargerCertificat(item.idCertificat, statut)
                        }
                        disabled={enTelechargement || !peutTelecharger}
                        title={
                          !peutTelecharger
                            ? statut === "annulee"
                              ? "Demande annulée par le formateur"
                              : "En attente de validation par le formateur"
                            : "Télécharger mon certificat PDF"
                        }
                      >
                        {enTelechargement ? (
                          <>
                            <span className={styles.buttonSpinner}></span>
                            Préparation du PDF...
                          </>
                        ) : peutTelecharger ? (
                          <>
                            <span>↓</span>
                            Télécharger mon certificat PDF
                          </>
                        ) : statut === "annulee" ? (
                          <>Demande annulée par le formateur</>
                        ) : (
                          <>⏳ En attente de validation du formateur</>
                        )}
                      </button>

                      <p className={styles.downloadHint}>
                        {peutTelecharger ? (
                          <>
                            <span>✓</span>
                            Document PDF téléchargeable
                          </>
                        ) : (
                          <>
                            <span>⏳</span>
                            Le téléchargement sera disponible après validation par votre formateur
                          </>
                        )}
                      </p>

                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* BOTTOM NAVIGATION */}

        <footer className={styles.footer}>
          <div>
            <span className={styles.footerIcon}>✦</span>

            <div>
              <strong>Continuez votre progression !</strong>
              <p>
                Chaque nouvelle formation est une opportunité
                de développer vos compétences.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.footerButton}
            onClick={retournerDashboard}
          >
            ← Retour au tableau de bord
          </button>
        </footer>

        <div className={styles.copyright}>
          © {new Date().getFullYear()} LearningPro Academy.
          Tous droits réservés.
        </div>

      </div>
    </main>
  );
}