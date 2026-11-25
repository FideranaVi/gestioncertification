"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Mail, User, Trophy, BookOpen, FileText, Pencil, X, Save, LogOut } from "lucide-react";
import styles from "./profil.module.css";

import { obtenirApiApprenant } from "@/lib/api";
const API = obtenirApiApprenant();

// ===== NAVIGATION BAS =====
function BottomNav({ actif = "profil" }) {
  return (
    <nav className={styles.bottomNav}>
      <Link href="/dashboard/apprenant" className={actif === "accueil" ? styles.active : ""}>
        <span>🏠</span><span>Accueil</span>
      </Link>
      <Link href="/dashboard/apprenant/formations" className={actif === "formations" ? styles.active : ""}>
        <span>📚</span><span>Formations</span>
      </Link>
      <Link href="/dashboard/apprenant/quiz" className={actif === "quiz" ? styles.active : ""}>
        <span>📝</span><span>Quiz</span>
      </Link>
      <Link href="/dashboard/apprenant/resultats" className={actif === "resultats" ? styles.active : ""}>
        <span>📊</span><span>Résultats</span>
      </Link>
      <Link href="/dashboard/apprenant/certificats" className={actif === "certificats" ? styles.active : ""}>
        <span>🏆</span><span>Certificats</span>
      </Link>
      <Link href="/dashboard/apprenant/profil" className={actif === "profil" ? styles.active : ""}>
        <span>👤</span><span>Profil</span>
      </Link>
    </nav>
  );
}

export default function ProfilPage() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);
  const [statistiques, setStatistiques] = useState({});
  const [chargement, setChargement] = useState(true);

  const [photoProfil, setPhotoProfil] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("photoProfil") || "";
  });

  const fileRef = useRef(null);

  // ===== MODIFIER PROFIL =====
  const [enEdition, setEnEdition] = useState(false);
  const [formulaire, setFormulaire] = useState({ nom: "", prenom: "", email: "", motDePasse: "" });
  const [sauvegarde, setSauvegarde] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) throw new Error("Non connecté");
        const res = await fetch(`${API}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
        setUtilisateur(data.utilisateur || {});
        setStatistiques(data.statistiques || {});
        // Pré-remplir le formulaire avec les vraies données
        setFormulaire({
          nom: data.utilisateur?.nom || "",
          prenom: data.utilisateur?.prenom || "",
          email: data.utilisateur?.email || "",
          motDePasse: "",
        });
      } catch {
        router.replace("/connexion");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [router]);

  const changerPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoProfil(reader.result);
      localStorage.setItem("photoProfil", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const ouvrirEdition = () => {
    setFormulaire({
      nom: utilisateur?.nom || "",
      prenom: utilisateur?.prenom || "",
      email: utilisateur?.email || "",
      motDePasse: "",
    });
    setErreur("");
    setMessage("");
    setEnEdition(true);
  };

  const annulerEdition = () => {
    setEnEdition(false);
    setErreur("");
    setMessage("");
    setFormulaire({
      nom: utilisateur?.nom || "",
      prenom: utilisateur?.prenom || "",
      email: utilisateur?.email || "",
      motDePasse: "",
    });
  };

  const sauvegarderProfil = async (e) => {
    e.preventDefault();
    if (sauvegarde) return;
    setErreur("");
    setMessage("");
    setSauvegarde(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) throw new Error("Non connecté");

      const corps = {
        nom: formulaire.nom.trim(),
        prenom: formulaire.prenom.trim(),
        email: formulaire.email.trim(),
      };
      // Mot de passe seulement si rempli
      if (formulaire.motDePasse.trim()) corps.motDePasse = formulaire.motDePasse.trim();

      if (!corps.nom || !corps.prenom || !corps.email) throw new Error("Nom, prénom et email sont obligatoires.");

      // Essaie les 2 routes possibles, la 1ère qui marche gagne
      const routes = [`${API}/profil`, `${API}/utilisateurs/me`, `${API}/dashboard/profil`];
      let derniereErreur = null;
      let reussi = false;

      for (const url of routes) {
        try {
          const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(corps),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const nouveau = data.utilisateur || data.data?.utilisateur || { ...utilisateur, ...corps };
            setUtilisateur((ancien) => ({ ...ancien, ...nouveau, nom: corps.nom, prenom: corps.prenom, email: corps.email }));
            reussi = true;
            break;
          }
          // 404 = route n'existe pas, on essaie la suivante
          if (res.status === 404) { derniereErreur = new Error("Route profil non trouvée sur le backend"); continue; }
          throw new Error(data.message || data.error || "Impossible de modifier le profil.");
        } catch (err) {
          if (err.message?.includes("Route profil")) { derniereErreur = err; continue; }
          throw err;
        }
      }

      if (!reussi) throw derniereErreur || new Error("Impossible de modifier le profil. Vérifie la route backend.");

      setMessage("Profil modifié avec succès !");
      setEnEdition(false);
      setFormulaire((f) => ({ ...f, motDePasse: "" }));
    } catch (err) {
      setErreur(err.message || "Impossible de modifier le profil.");
    } finally {
      setSauvegarde(false);
    }
  };

  const deconnecter = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    router.replace("/connexion");
  };

  if (chargement) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>Chargement...</div>
        <BottomNav actif="profil" />
      </main>
    );
  }

  const nomComplet = `${utilisateur?.nom || ""} ${utilisateur?.prenom || ""}`.trim();
  const initiale = utilisateur?.nom?.charAt(0)?.toUpperCase() || "A";
  const photoAffichee = utilisateur?.photo || utilisateur?.picture || photoProfil;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* ===== TOP BAR FIXÉE ===== */}
        <header className={styles.topBar}>
          <Link href="/dashboard/apprenant" className={styles.back}>
            <ArrowLeft size={18} /> Retour
          </Link>
          <span className={styles.topBarLabel}>Mon profil</span>
          {!enEdition ? (
            <button type="button" className={styles.editTopBtn} onClick={ouvrirEdition}>
              <Pencil size={16} /> Modifier
            </button>
          ) : (
            <button type="button" className={styles.cancelTopBtn} onClick={annulerEdition}>
              <X size={16} /> Annuler
            </button>
          )}
        </header>

        {erreur && <div className={styles.errorNotice}>{erreur}</div>}
        {message && <div className={styles.successNotice}>{message}</div>}

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.photoWrap}>
              {photoAffichee ? (
                <img src={photoAffichee} alt="Profil" className={styles.photo} />
              ) : (
                <div className={styles.avatar}>{initiale}</div>
              )}
              <button type="button" className={styles.camera} onClick={() => fileRef.current?.click()}>
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={changerPhoto} />
            </div>
            <h1>{nomComplet || "Apprenant"}</h1>
            <span className={styles.role}>Apprenant</span>
            <p>Clique sur l&apos;icône caméra pour changer ta photo de profil.</p>

            {!enEdition && (
              <button type="button" className={styles.editBtn} onClick={ouvrirEdition}>
                <Pencil size={16} /> Modifier mon profil
              </button>
            )}
          </div>

          {/* ===== FORMULAIRE MODIFIER ===== */}
          {enEdition ? (
            <form className={styles.form} onSubmit={sauvegarderProfil}>
              <div className={styles.field}>
                <label>Nom</label>
                <input
                  type="text"
                  value={formulaire.nom}
                  onChange={(e) => setFormulaire((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Ton nom"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Prénom</label>
                <input
                  type="text"
                  value={formulaire.prenom}
                  onChange={(e) => setFormulaire((f) => ({ ...f, prenom: e.target.value }))}
                  placeholder="Ton prénom"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <input
                  type="email"
                  value={formulaire.email}
                  onChange={(e) => setFormulaire((f) => ({ ...f, email: e.target.value }))}
                  placeholder="ton@email.com"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Nouveau mot de passe <span className={styles.optional}>(optionnel)</span></label>
                <input
                  type="password"
                  value={formulaire.motDePasse}
                  onChange={(e) => setFormulaire((f) => ({ ...f, motDePasse: e.target.value }))}
                  placeholder="Laisse vide si tu ne veux pas changer"
                />
                <small className={styles.hint}>Laisse vide pour garder l&apos;ancien mot de passe.</small>
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveBtn} disabled={sauvegarde}>
                  <Save size={16} /> {sauvegarde ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" className={styles.cancelBtn} onClick={annulerEdition} disabled={sauvegarde}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.infos}>
              <div className={styles.row}>
                <User size={20} />
                <div><small>Nom</small><strong>{utilisateur?.nom || "-"}</strong></div>
              </div>
              <div className={styles.row}>
                <User size={20} />
                <div><small>Prénom</small><strong>{utilisateur?.prenom || "-"}</strong></div>
              </div>
              <div className={styles.row}>
                <Mail size={20} />
                <div><small>Email</small><strong>{utilisateur?.email || "-"}</strong></div>
              </div>
              <div className={styles.row}>
                <BookOpen size={20} />
                <div><small>Formations</small><strong>{statistiques.nombreFormations ?? 0}</strong></div>
              </div>
              <div className={styles.row}>
                <FileText size={20} />
                <div><small>Quiz terminés</small><strong>{statistiques.tentativesTerminees ?? 0}</strong></div>
              </div>
              <div className={styles.row}>
                <Trophy size={20} />
                <div><small>Certificats</small><strong>{statistiques.nombreCertificats ?? 0}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* ===== ACTIONS BAS ===== */}
        <div className={styles.bottomActions}>
          <button type="button" className={styles.logoutBtn} onClick={deconnecter}>
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>

      <BottomNav actif="profil" />
    </main>
  );
}