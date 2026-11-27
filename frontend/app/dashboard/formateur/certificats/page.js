"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./certificats.module.css";
import { obtenirApiFormateur } from "@/lib/api";

const API = obtenirApiFormateur();

export default function CertificatsFormateurPage() {
  const router = useRouter();
  const [lignes, setLignes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [traitement, setTraitement] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");

  const pick = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  };

  const getNomApprenant = (obj) => {
    if (!obj) return { nom: "Apprenant inconnu", email: "" };
    const u = obj.apprenant || obj.Apprenant || obj.utilisateur || obj.Utilisateur || obj;
    if (typeof u === "object") {
      const nom = pick(u.nom, u.NOM, u.nomApprenant);
      const prenom = pick(u.prenom, u.Prenom, u.prénom, u.prenomApprenant);
      const email = pick(u.email, u.mail);
      if (nom || prenom) {
        const n = nom ? String(nom).toUpperCase() : "";
        const p = prenom ? String(prenom).charAt(0).toUpperCase() + String(prenom).slice(1).toLowerCase() : "";
        return { nom: [n, p].filter(Boolean).join(" ") || "Apprenant inconnu", email: email || "" };
      }
      const nomDirect = pick(obj.nomApprenant, obj.nom, obj.nomComplet);
      const prenomDirect = pick(obj.prenomApprenant, obj.prenom);
      if (nomDirect || prenomDirect) {
        return { nom: [String(nomDirect || "").toUpperCase(), String(prenomDirect || "")].filter(Boolean).join(" "), email: pick(obj.emailApprenant, obj.email) || "" };
      }
    }
    if (typeof u === "string") return { nom: u, email: "" };
    return { nom: "Apprenant #" + (pick(obj.idApprenant, obj.id_apprenant) || "?"), email: "" };
  };

  const getFormation = (obj) => {
    if (!obj) return { titre: "Formation", quiz: "Quiz" };
    const f = obj.formation || obj.Formation || obj;
    const titre = pick(f.titre, f.titreFormation, f.nomFormation, obj.titreFormation, obj.nomFormation, obj.titre);
    const quiz = pick(obj.quiz?.nomQuiz, obj.quiz?.titre, obj.Quiz?.nomQuiz, obj.nomQuiz, obj.titreQuiz, obj.codeQuiz, obj.code_quiz);
    return { titre: titre ? String(titre) : "Formation", quiz: quiz ? String(quiz) : "Quiz" };
  };

  const getScore = (obj) => {
    const s = pick(obj.score, obj.note, obj.pourcentage, obj.evaluation?.score, obj.scoreObtenu);
    if (s === null) return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  };

  const charger = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("Session expiree. Veuillez vous reconnecter.");
    const headers = { Authorization: "Bearer " + token };

    const resCert = await fetch(API + "/certificats", { headers, cache: "no-store" });
    const dataCert = await resCert.json().catch(() => []);
    if (!resCert.ok) throw new Error(`Certificats HTTP ${resCert.status}`);

    let dataTent = [];
    try {
      const resTent = await fetch(API + "/tentatives", { headers, cache: "no-store" });
      dataTent = await resTent.json().catch(() => []);
    } catch (e) {
      dataTent = [];
    }

    const certificats = Array.isArray(dataCert) ? dataCert : dataCert?.certificats || dataCert?.data || dataCert?.rows || [];
    const tentatives = Array.isArray(dataTent) ? dataTent : dataTent?.tentatives || dataTent?.data || dataTent?.rows || [];

    const lignesFusion = [];

    tentatives.forEach((t, idx) => {
      const score = getScore(t);
      const resultatBrut = String(pick(t.resultat, t.evaluation?.resultat, t.statut) || "").toLowerCase();
      const reussie = ["reussi", "réussi", "reussie", "réussie", "success", "passed", "valide"].includes(resultatBrut) || (score !== null && score >= 50);
      const echouee = ["echoue", "échoué", "echec", "échec", "failed"].includes(resultatBrut) || (score !== null && score < 50);
      const appr = getNomApprenant(t);
      const form = getFormation(t);
      const idTent = pick(t.idTentative, t.id, t.id_tentative);
      const idCert = pick(t.idCertificat, t.id_certificat);
      const cert = certificats.find((c) => {
        if (idCert && pick(c.idCertificat, c.id, c.id_certificat) && String(pick(c.idCertificat, c.id)) === String(idCert)) return true;
        if (idTent && pick(c.idTentative, c.id_tentative) && String(pick(c.idTentative)) === String(idTent)) return true;
        const idAppT = pick(t.idApprenant, t.id_apprenant);
        const idAppC = pick(c.idApprenant, c.id_apprenant);
        if (idAppT && idAppC && String(idAppT) === String(idAppC)) return true;
        return false;
      });
      const statutCert = cert ? String(pick(cert.statutCertificat, cert.statut, cert.etat) || "en_attente").toLowerCase() : "en_attente";
      lignesFusion.push({
        key: `tent-${idTent || idx}`,
        idTentative: idTent,
        idCertificat: cert ? pick(cert.idCertificat, cert.id, cert.id_certificat) : idCert,
        nomApprenant: appr.nom,
        emailApprenant: appr.email,
        titreFormation: form.titre,
        nomQuiz: form.quiz,
        score,
        resultat: reussie ? "Réussi" : echouee ? "Échoué" : "En cours",
        reussie,
        statutTentative: String(pick(t.statut, t.statutTentative, t.etat) || "").toLowerCase(),
        dateTentative: pick(t.dateTentative, t.dateCreation, t.createdAt, t.derniereActivite, cert?.dateObtention),
        nbSorties: pick(t.nbSortiesEcran, t.nbSorties, t.sorties) ?? 0,
        statutCertificat: statutCert,
        numeroCertificat: cert ? pick(cert.numeroCertificat, cert.numero, cert.reference) : null,
      });
    });

    certificats.forEach((c, idx) => {
      const idC = pick(c.idCertificat, c.id, c.id_certificat);
      const deja = lignesFusion.some((l) => l.idCertificat && String(l.idCertificat) === String(idC));
      if (deja) return;
      const appr = getNomApprenant(c);
      const form = getFormation(c);
      lignesFusion.push({
        key: `cert-${idC || idx}`,
        idTentative: pick(c.idTentative, c.id_tentative),
        idCertificat: idC,
        nomApprenant: appr.nom,
        emailApprenant: appr.email,
        titreFormation: form.titre,
        nomQuiz: form.quiz,
        score: getScore(c),
        resultat: "—",
        reussie: false,
        statutTentative: "",
        dateTentative: pick(c.dateObtention, c.dateCreation, c.createdAt),
        nbSorties: 0,
        statutCertificat: String(pick(c.statutCertificat, c.statut, c.etat) || "en_attente").toLowerCase(),
        numeroCertificat: pick(c.numeroCertificat, c.numero, c.reference),
      });
    });

    return lignesFusion;
  };

  useEffect(() => {
    let actif = true;
    charger()
      .then((liste) => {
        if (!actif) return;
        setLignes(liste);
        setChargement(false);
      })
      .catch((e) => {
        if (!actif) return;
        setErreur(e.message);
        setChargement(false);
      });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recharger = () => {
    setChargement(true);
    setErreur("");
    setSucces("");
    charger()
      .then((liste) => {
        setLignes(liste);
        setChargement(false);
      })
      .catch((e) => {
        setErreur(e.message);
        setChargement(false);
      });
  };

  const formaterDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const libelleStatut = (s) => (s === "validee" ? "Validé" : s === "annulee" ? "Refusé" : "En attente");

  const traiter = async (ligne, decision) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) { setErreur("Session expiree."); return; }
    if (!window.confirm(decision === "valider" ? `Valider le certificat de ${ligne.nomApprenant} ?` : `Refuser le certificat de ${ligne.nomApprenant} ?`)) return;
    setTraitement(ligne.key);
    setErreur("");
    setSucces("");
    try {
      let res;
      if (ligne.idCertificat) {
        res = await fetch(API + "/certificats/" + encodeURIComponent(ligne.idCertificat) + "/statut", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ statutCertificat: decision === "valider" ? "validee" : "annulee" }),
        });
      } else if (ligne.idTentative) {
        res = await fetch(API + "/tentatives/" + encodeURIComponent(ligne.idTentative) + "/certificat", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        });
      } else {
        throw new Error("Aucun idTentative / idCertificat pour cette ligne.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Impossible de traiter.");
      setSucces(data.message || (decision === "valider" ? "Certificat validé." : "Certificat refusé."));
      const nl = await charger();
      setLignes(nl);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setTraitement(null);
    }
  };

  const filtrees = lignes.filter((l) => {
    if (filtre === "validee" || filtre === "annulee" || filtre === "en_attente") {
      if (l.statutCertificat !== filtre) return false;
    }
    if (filtre === "reussis" && !l.reussie) return false;
    if (!recherche.trim()) return true;
    const t = recherche.trim().toLowerCase();
    return l.nomApprenant.toLowerCase().includes(t) || l.titreFormation.toLowerCase().includes(t) || l.nomQuiz.toLowerCase().includes(t);
  });

  const nbEnAttente = lignes.filter((l) => l.statutCertificat === "en_attente").length;
  const nbValides = lignes.filter((l) => l.statutCertificat === "validee").length;
  const nbRefuses = lignes.filter((l) => l.statutCertificat === "annulee").length;
  const nbReussis = lignes.filter((l) => l.reussie).length;

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingContainer}><div className={styles.spinner} /><h3>Chargement...</h3><p>On récupère les apprenants et leurs tentatives...</p></div>
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
          <div>
            <span className={styles.eyebrow}>LEARNING PRO / ESPACE FORMATEUR</span>
            <h1>Validation des <span>certificats</span></h1>
            <p>Apprenants qui ont passé votre quiz. Vérifiez score + tentative, puis validez ou refusez — même si l&apos;apprenant a réussi.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={recharger}>Actualiser</button>
        </header>
        {erreur && <div className={styles.error}><span>!</span>{erreur}</div>}
        {succes && <div className={styles.success}><span>OK</span>{succes}</div>}
        <section className={styles.summary}>
          <div className={styles.summaryStat}><span>Apprenants</span><strong>{lignes.length}</strong></div>
          <div className={styles.summaryStat}><span>Réussis</span><strong>{nbReussis}</strong></div>
          <div className={styles.summaryStat}><span>En attente</span><strong>{nbEnAttente}</strong></div>
          <div className={styles.summaryStat}><span>Validés</span><strong>{nbValides}</strong></div>
          <div className={styles.summaryStat}><span>Refusés</span><strong>{nbRefuses}</strong></div>
        </section>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button type="button" className={filtre === "tous" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("tous")}>Tous ({lignes.length})</button>
            <button type="button" className={filtre === "reussis" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("reussis")}>Réussis ({nbReussis})</button>
            <button type="button" className={filtre === "en_attente" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("en_attente")}>En attente ({nbEnAttente})</button>
            <button type="button" className={filtre === "validee" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("validee")}>Validés ({nbValides})</button>
            <button type="button" className={filtre === "annulee" ? styles.filterActive : styles.filterButton} onClick={() => setFiltre("annulee")}>Refusés ({nbRefuses})</button>
          </div>
          <div className={styles.searchWrap}><span>🔍</span><input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher apprenant, formation, quiz..." className={styles.searchInput} /></div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Apprenant</th><th>Formation / Quiz</th><th>Score</th><th>Résultat</th><th>Tentative</th><th>Sorties</th><th>Statut certificat</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtrees.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "28px", color: "#65676b" }}>Aucune ligne à afficher.</td></tr>
              ) : (
                filtrees.map((ligne) => {
                  const enCours = traitement === ligne.key;
                  return (
                    <tr key={ligne.key}>
                      <td><strong>{ligne.nomApprenant}</strong><br /><span className={styles.subText}>{ligne.emailApprenant}</span></td>
                      <td><strong>{ligne.titreFormation}</strong><br /><span className={styles.subText}>{ligne.nomQuiz}</span></td>
                      <td><strong>{ligne.score !== null ? `${ligne.score} %` : "—"}</strong></td>
                      <td><span className={`${styles.resultBadge} ${ligne.reussie ? styles.resultOk : ligne.resultat === "Échoué" ? styles.resultFail : styles.resultWait}`}>{ligne.resultat}</span></td>
                      <td>{formaterDate(ligne.dateTentative)}<br /><span className={styles.subText}>{ligne.statutTentative}</span></td>
                      <td>{ligne.nbSorties}</td>
                      <td><span className={`${styles.verifiedBadge} ${ligne.statutCertificat === "validee" ? styles.badgeValide : ligne.statutCertificat === "annulee" ? styles.badgeRefuse : styles.badgeAttente}`}>{libelleStatut(ligne.statutCertificat)}</span></td>
                      <td>
                        <div className={styles.tableActions}>
                          <button type="button" className={styles.validateButton} disabled={enCours} onClick={() => traiter(ligne, "valider")}>{enCours ? "..." : "✓ Valider"}</button>
                          <button type="button" className={styles.refuseButton} disabled={enCours} onClick={() => traiter(ligne, "refuser")}>Refuser</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className={styles.tableHint}>{filtrees.length} apprenant(s) affiché(s). Même si réussi, c&apos;est le formateur qui décide.</p>
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