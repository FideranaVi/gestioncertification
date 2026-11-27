"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./certificats.module.css";
import { obtenirApiFormateur } from "@/lib/api";

const API = obtenirApiFormateur();

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
  const [recherche, setRecherche] = useState("");

  const charger = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("Session expiree. Veuillez vous reconnecter.");
    const response = await fetch(API + "/certificats", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} : ${data.message || "Impossible de charger les certificats."}`);
    }
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.certificats)) return data.certificats;
    if (Array.isArray(data.data)) return data.data;
    return [];
  };

  useEffect(() => {
    let actif = true;
    charger()
      .then((liste) => { if (actif) { setCertificats(liste); setChargement(false); } })
      .catch((e) => { if (actif) { setErreur(e.message); setChargement(false); } });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recharger = () => {
    setChargement(true); setErreur(""); setSucces("");
    charger()
      .then((liste) => { setCertificats(liste); setChargement(false); })
      .catch((e) => { setErreur(e.message); setChargement(false); });
  };

  const formaterDate = (date) => {
    if (!date) return "Date non disponible";
    const valeur = new Date(date);
    if (Number.isNaN(valeur.getTime())) return "Date non disponible";
    return valeur.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };
  const obtenirTitre = (item) => {
    if (item.formation && item.formation.titre) return item.formation.titre;
    if (item.Formation && item.Formation.titre) return item.Formation.titre;
    if (item.titreFormation) return item.titreFormation;
    if (item.titre) return item.titre;
    return "Formation " + (item.numFormation || item.idFormation || "");
  };
  const obtenirNomComplet = (utilisateur) => {
    if (!utilisateur) return "Non renseigne";
    const nom = (utilisateur.nom || "").trim().toUpperCase();
    let prenom = (utilisateur.prenom || "").trim();
    if (prenom) prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    const complet = [nom, prenom].filter(Boolean).join(" ");
    return complet || "Non renseigne";
  };
  const obtenirStatut = (item) => item.statutCertificat || item.statut || "en_attente";
  const obtenirLibelleStatut = (statut) => {
    if (statut === "validee") return "Valide";
    if (statut === "annulee") return "Refuse";
    return "En attente";
  };

  const traiterCertificat = (idCertificat, decision) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setErreur("Session expiree. Veuillez vous reconnecter."); return; }
    if (!idCertificat || idCertificat === "undefined") { setErreur("Identifiant de certificat invalide. Recharge la page."); return; }
    if (!window.confirm(decision === "valider" ? "Valider ce certificat ?" : "Refuser ce certificat ?")) return;
    const statutCertificat = decision === "valider" ? "validee" : "annulee";
    setTraitement(idCertificat); setErreur(""); setSucces("");
    fetch(API + "/certificats/" + encodeURIComponent(idCertificat) + "/statut", {
      method: "PATCH",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ statutCertificat }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Impossible de traiter le certificat.");
        return data;
      })
      .then((data) => {
        setSucces(data.message || (decision === "valider" ? "Certificat valide." : "Certificat refuse."));
        setCertificats((anciens) => anciens.map((item) => getIdCertificat(item) === idCertificat ? Object.assign({}, item, { statutCertificat }) : item));
        setTraitement(null);
      })
      .catch((error) => { setErreur(error.message); setTraitement(null); });
  };

  const certificatsFiltres = certificats.filter((item) => {
    if (filtre !== "tous" && obtenirStatut(item) !== filtre) return false;
    if (!recherche.trim()) return true;
    const terme = recherche.trim().toLowerCase();
    const nom = obtenirNomComplet(item.apprenant || item.Apprenant || item.utilisateur || item.Utilisateur).toLowerCase();
    const titre = obtenirTitre(item).toLowerCase();
    return nom.includes(terme) || titre.includes(terme) || String(item.numeroCertificat || "").toLowerCase().includes(terme);
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
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => router.push("/dashboard/formateur")}>← Retour</button>
        <span className={styles.pageTitle}>Certificats</span>
        <span className={styles.topBarSpacer} />
      </div>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.eyebrow}>LEARNING PRO / ESPACE FORMATEUR</span>
            <h1>Demandes de <span>certificats</span></h1>
            <p>Validez ou refusez les demandes de vos apprenants. Vous seul decidez.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={recharger}>Actualiser</button>
        </header>
        {erreur && <div className={styles.error}><span>!</span>{erreur}</div>}
        {succes && <div className={styles.success}><span>OK</span>{succes}</div>}
        <section className={styles.summary}>
          <div className={styles.summaryStat}><span>En attente</span><strong>{nbEnAttente}</strong></div>
          <div className={styles.summaryStat}><span>Valides</span><strong>{nbValides}</strong></div>
          <div className={styles.summaryStat}><span>Refuses</span><strong>{nbRefuses}</strong></div>
          <div className={styles.summaryStat}><span>Total</span><strong>{certificats.length}</strong></div>
        </section>

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button type="button" className={filtre === "tous" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("tous")}>Tous ({certificats.length})</button>
            <button type="button" className={filtre === "en_attente" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("en_attente")}>En attente ({nbEnAttente})</button>
            <button type="button" className={filtre === "validee" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("validee")}>Valides ({nbValides})</button>
            <button type="button" className={filtre === "annulee" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("annulee")}>Refuses ({nbRefuses})</button>
          </div>
          <div className={styles.searchWrap}>
            <span>🔍</span>
            <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher apprenant, formation, référence..." className={styles.searchInput} />
          </div>
        </div>

        {certificatsFiltres.length === 0 ? (
          <div className={styles.empty}><h3>Aucune demande pour ce filtre</h3><p>Aucun apprenant n a encore demande de certificat ici.</p></div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Formation</th>
                  <th>Date</th>
                  <th>Référence</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificatsFiltres.map((item, index) => {
                  const idCertificat = getIdCertificat(item);
                  const titre = obtenirTitre(item);
                  const nomApprenant = obtenirNomComplet(item.apprenant || item.Apprenant || item.utilisateur || item.Utilisateur);
                  const statut = obtenirStatut(item);
                  const enCours = traitement === idCertificat;
                  return (
                    <tr key={idCertificat || index}>
                      <td><strong>{nomApprenant}</strong></td>
                      <td>{titre}</td>
                      <td>{formaterDate(item.dateObtention || item.dateCreation)}</td>
                      <td><span className={styles.refBadge}>{item.numeroCertificat || idCertificat || "—"}</span></td>
                      <td>
                        <span className={`${styles.verifiedBadge} ${statut === "validee" ? styles.badgeValide : statut === "annulee" ? styles.badgeRefuse : styles.badgeAttente}`}>{obtenirLibelleStatut(statut)}</span>
                      </td>
                      <td>
                        {statut === "en_attente" ? (
                          <div className={styles.tableActions}>
                            <button type="button" className={styles.validateButton} disabled={enCours} onClick={() => traiterCertificat(idCertificat, "valider")}>{enCours ? "..." : "✓ Valider"}</button>
                            <button type="button" className={styles.refuseButton} disabled={enCours} onClick={() => traiterCertificat(idCertificat, "refuser")}>Refuser</button>
                          </div>
                        ) : (
                          <span className={styles.actionDone}>{statut === "validee" ? "Déjà validé" : "Déjà refusé"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.tableHint}>{certificatsFiltres.length} certificat(s) affiché(s). La validation ici est définitive et visible par l&apos;apprenant.</p>
      </div>
      <nav className={styles.bottomNav}>
        <Link href="/dashboard/formateur" className={styles.bottomNavLink}>Tableau de bord</Link>
        <Link href="/dashboard/formateur/formations" className={styles.bottomNavLink}>Formations</Link>
        <Link href="/dashboard/formateur/certificats" className={`${styles.bottomNavLink} ${styles.bottomNavActive}`}>Certificats</Link>
        <Link href="/dashboard/formateur/profil" className={styles.bottomNavLink}>Profil</Link>
      </nav>
    </main>
  );
}