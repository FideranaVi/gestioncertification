"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Impossible de charger les certificats.");
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

  // ✅ NOM avant Prénom : LÉONIE Marie
  const obtenirNomComplet = (utilisateur) => {
    if (!utilisateur) return "Non renseigné";
    const nom = (utilisateur.nom || "").trim().toUpperCase();
    const prenom = (utilisateur.prenom || "").trim();
    const prenomPropre = prenom
      ? prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase()
      : "";
    const complet = [nom, prenomPropre].filter(Boolean).join(" ");
    return complet || "Non renseigné";
  };

  const obtenirStatut = (item) => {
    return item.statutCertificat || "en_attente";
  };

  const obtenirLibelleStatut = (statut) => {
    if (statut === "validee") return "Validé";
    if (statut === "annulee") return "Refusé par le formateur";
    return "En attente de validation";
  };

  const reprendreQuiz = (item) => {
    if (item.numFormation) {
      router.push(`/dashboard/apprenant/formations/${item.numFormation}`);
    } else if (item.codeQuiz) {
      router.push(`/dashboard/apprenant/quiz/${item.codeQuiz}`);
    } else {
      router.push("/dashboard/apprenant");
    }
  };

  const telechargerCertificat = async (id, statut) => {
    if (statut && statut !== "validee") {
      setSucces("");
      setErreur(
        statut === "annulee"
          ? "Cette demande a été refusée. Aucun certificat n'a été délivré."
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
      const response = await fetch(`${API}/certificats/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  // ✅ VRAIE LOGIQUE PRO
  // Certificats affichés = Validés + En attente UNIQUEMENT
  // Refusés = JAMAIS affichés comme certificats, ils vont dans une petite liste à part
  const certificatsAffiches = certificats.filter(
    (item) => obtenirStatut(item) !== "annulee"
  );

  const demandesRefusees = certificats.filter(
    (item) => obtenirStatut(item) === "annulee"
  );

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
      {/* NAVIGATION HAUTE - SoloLearn */}
      <nav className={styles.topNav}>
        <Link href="/dashboard/apprenant" className={styles.logo}>
          <span className={styles.logoIcon}>L</span>
          LearningPro
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard/apprenant">Tableau de bord</Link>
          <Link href="/dashboard/apprenant/formations">Formations</Link>
          <Link href="/dashboard/apprenant/certificats" className={styles.navActive}>
            Certificats
          </Link>
          <Link href="/dashboard/apprenant/profil">Profil</Link>
        </div>
        <button type="button" className={styles.navBack} onClick={retournerDashboard}>
          ← Retour
        </button>
      </nav>

      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>LEARNING PRO / ESPACE APPRENANT</span>
            <h1>
              Mes <span>certifications</span>
            </h1>
            <p>
              Retrouvez vos réussites et téléchargez vos certificats validés.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={chargerCertificats}
            >
              ↻ Actualiser
            </button>
          </div>
        </header>

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

        <section className={styles.summary}>
          <div className={styles.summaryLeft}>
            <div className={styles.summaryIcon}>✦</div>
            <div>
              <span className={styles.summaryLabel}>VOTRE PARCOURS DE RÉUSSITE</span>
              <h2>Chaque compétence mérite d&apos;être célébrée.</h2>
              <p>Continuez à apprendre et construisez votre avenir avec LearningPro.</p>
            </div>
          </div>
          <div className={styles.summaryStat}>
            <span>Certificats obtenus</span>
            <strong>{certificatsValides.length}</strong>
            <small>Seuls les validés comptent</small>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>VOS ACCOMPLISSEMENTS</span>
              <h2>Mes réussites</h2>
              <p>Retrouvez ici vos certificats validés et en attente.</p>
            </div>
            <div className={styles.countBadge}>
              {certificatsAffiches.length} certificat(s)
            </div>
          </div>

          {certificatsAffiches.length === 0 && demandesRefusees.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><span>✧</span></div>
              <h3>Votre première certification vous attend !</h3>
              <p>
                Vous n&apos;avez pas encore obtenu de certificat.
                Poursuivez vos formations, réussissez vos évaluations
                et vos certificats apparaîtront ici.
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
            <>
              {/* ===== CERTIFICATS : Validés + En attente SEULEMENT ===== */}
              {certificatsAffiches.length > 0 && (
                <div className={styles.certificateGrid}>
                  {certificatsAffiches.map((item, index) => {
                    const titre = obtenirTitre(item);
                    const nomApprenant = obtenirNomComplet(
                      item.apprenant || item.Apprenant || item.utilisateur
                    );
                    const nomFormateur = obtenirNomComplet(
                      item.formateur || item.Formateur
                    );
                    const statut = obtenirStatut(item);
                    const enTelechargement = telechargement === item.idCertificat;
                    const peutTelecharger = statut === "validee";

                    return (
                      <article
                        className={styles.certificateCard}
                        key={item.idCertificat || index}
                      >
                        <div className={styles.certificatePreview}>
                          <div className={styles.certificateBorder}>
                            <div className={styles.previewContent}>
                              <span className={styles.previewEyebrow}>
                                {peutTelecharger ? "CERTIFICAT" : "EN ATTENTE"}
                              </span>
                              <h3>{peutTelecharger ? "✓" : "⏳"}</h3>
                              <h4>{titre}</h4>
                              <div className={styles.goldLine}></div>
                              <span className={styles.previewName}>{nomApprenant}</span>
                            </div>
                          </div>
                        </div>

                        <div className={styles.certificateInfo}>
                          <div className={styles.cardHeader}>
                            <div>
                              <span className={styles.label}>CERTIFICATION</span>
                              <h3>{titre}</h3>
                            </div>
                            {peutTelecharger ? (
                              <span className={styles.verifiedBadge}>✓ Validé</span>
                            ) : (
                              <span className={styles.verifiedBadge}>⏳ En attente</span>
                            )}
                          </div>

                          <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>APPRENANT</span>
                              <strong>{nomApprenant}</strong>
                            </div>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>FORMATEUR</span>
                              <strong>{nomFormateur}</strong>
                            </div>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>DATE</span>
                              <strong>{formaterDate(item.dateObtention)}</strong>
                            </div>
                            <div className={styles.infoItem}>
                              <span className={styles.label}>RÉFÉRENCE</span>
                              <strong>
                                {item.numeroCertificat || item.idCertificat || "Non disponible"}
                              </strong>
                            </div>
                          </div>

                          <div className={styles.statusInfo}>
                            Statut : {obtenirLibelleStatut(statut)}
                          </div>

                          <button
                            type="button"
                            className={styles.downloadButton}
                            onClick={() => telechargerCertificat(item.idCertificat, statut)}
                            disabled={enTelechargement || !peutTelecharger}
                          >
                            {enTelechargement ? (
                              <>
                                <span className={styles.buttonSpinner}></span>
                                Préparation du PDF...
                              </>
                            ) : peutTelecharger ? (
                              <>↓ Télécharger mon certificat PDF</>
                            ) : (
                              <>⏳ En attente de validation du formateur</>
                            )}
                          </button>

                          <p className={styles.downloadHint}>
                            {peutTelecharger ? (
                              <>✓ Document PDF téléchargeable</>
                            ) : (
                              <>⏳ Le téléchargement sera disponible après validation par votre formateur</>
                            )}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* ===== REFUSÉS : petite ligne, PAS de certificat ===== */}
              {demandesRefusees.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                    Demandes refusées
                  </h3>
                  <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 10px" }}>
                    Ces demandes n&apos;ont pas donné lieu à un certificat. Vous pouvez repasser le quiz.
                  </p>
                  {demandesRefusees.map((item, index) => {
                    const titre = obtenirTitre(item);
                    const nomFormateur = obtenirNomComplet(item.formateur || item.Formateur);
                    return (
                      <div
                        key={item.idCertificat || index}
                        style={{
                          background: "#fff",
                          border: "1px solid #fecaca",
                          borderRadius: 10,
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13.5 }}>{titre}</strong>
                          <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                            Refusé par {nomFormateur} — Aucun certificat délivré
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.downloadButton}
                          style={{ width: "auto", padding: "8px 14px", whiteSpace: "nowrap" }}
                          onClick={() => reprendreQuiz(item)}
                        >
                          ↻ Reprendre le quiz
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <footer className={styles.footer}>
          <div>
            <span className={styles.footerIcon}>✦</span>
            <div>
              <strong>Continuez votre progression !</strong>
              <p>Chaque nouvelle formation est une opportunité de progresser.</p>
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
          © {new Date().getFullYear()} LearningPro Academy. Tous droits réservés.
        </div>
      </div>
    </main>
  );
}