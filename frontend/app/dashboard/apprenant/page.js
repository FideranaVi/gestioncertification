"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
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
  X
} from "lucide-react";
import styles from "./apprenant.module.css";

const API = "http://localhost:5000/api/apprenant";

export default function ApprenantDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  // Profil
  const [showProfil, setShowProfil] = useState(false);

  // ✅ CORRIGÉ : lecture de localStorage directement dans useState, pas dans useEffect
  const [photoProfil, setPhotoProfil] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("photoProfil") || "";
  });

  const fileRef = useRef(null);

  useEffect(() => {
    const chargerDashboard = async () => {
      try {
        const token =
          sessionStorage.getItem("token") ||
          localStorage.getItem("token");

        if (!token) {
          throw new Error("Veuillez vous connecter pour accéder au dashboard.");
        }

        const response = await fetch(`${API}/dashboard`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Impossible de charger le dashboard."
          );
        }

        setDashboard(data);
      } catch (error) {
        setErreur(error.message);
      } finally {
        setChargement(false);
      }
    };

    chargerDashboard();
  }, []);

  // Changer la photo de profil
  const changerPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      setPhotoProfil(url);
      localStorage.setItem("photoProfil", url);
    };
    reader.readAsDataURL(file);
  };

  const deconnecter = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("utilisateur");
    sessionStorage.removeItem("user");
    window.location.href = "/connexion";
  };

  if (chargement) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <h3>Learning Pro</h3>
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>!</div>
        <h2>Oups !</h2>
        <p>{erreur}</p>
        <Link href="/connexion" className={styles.loginButton}>
          Se connecter
        </Link>
      </div>
    );
  }

  const utilisateur = dashboard?.utilisateur || {};
  const statistiques = dashboard?.statistiques || {};
  const formations = dashboard?.formations || [];
  const tentatives = dashboard?.tentatives || [];

  const nomComplet = `${utilisateur.nom || ""} ${utilisateur.prenom || ""}`.trim();
  const initiale = utilisateur.nom?.charAt(0)?.toUpperCase() || "A";
  // Photo Google si elle existe, sinon photo choisie, sinon initiale
  const photoAffichee = utilisateur.photo || utilisateur.picture || photoProfil;

  const cartes = [
    {
      titre: "Formations",
      valeur: statistiques.nombreFormations ?? 0,
      icone: <BookOpen size={22} />,
      couleur: "green",
      lien: "/dashboard/apprenant/formations"
    },
    {
      titre: "Modules",
      valeur: statistiques.nombreModules ?? 0,
      icone: <Layers size={22} />,
      couleur: "blue",
      lien: "/dashboard/apprenant/formations"
    },
    {
      titre: "Quiz",
      valeur: statistiques.nombreQuiz ?? 0,
      icone: <FileText size={22} />,
      couleur: "orange",
      lien: "/dashboard/apprenant/quiz"
    },
    {
      titre: "Quiz terminés",
      valeur: statistiques.tentativesTerminees ?? 0,
      icone: <CheckCircle2 size={22} />,
      couleur: "purple",
      lien: "/dashboard/apprenant/resultats"
    },
    {
      titre: "Certificats",
      valeur: statistiques.nombreCertificats ?? 0,
      icone: <Trophy size={22} />,
      couleur: "gold",
      lien: "/dashboard/apprenant/certificats"
    }
  ];

  const activitesRecentes = [...tentatives]
    .sort(
      (a, b) =>
        new Date(b.dateTentative || 0) -
        new Date(a.dateTentative || 0)
    )
    .slice(0, 5);

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard/apprenant" className={styles.logo}>
          <span className={styles.logoIcon}>L</span>
          <span>LEARNING <strong>PRO</strong></span>
        </Link>

        <div className={styles.menuLabel}>MENU PRINCIPAL</div>

        <nav className={styles.navigation}>
          <Link href="/dashboard/apprenant" className={`${styles.navLink} ${styles.active}`}>
            <LayoutDashboard size={20} /> Tableau de bord
          </Link>

          <Link href="/dashboard/apprenant/formations" className={styles.navLink}>
            <BookOpen size={20} /> Mes formations
          </Link>

          <Link href="/dashboard/apprenant/quiz" className={styles.navLink}>
            <FileText size={20} /> Quiz
          </Link>

          <Link href="/dashboard/apprenant/resultats" className={styles.navLink}>
            <BarChart3 size={20} /> Mes résultats
          </Link>

          <Link href="/dashboard/apprenant/certificats" className={styles.navLink}>
            <Trophy size={20} /> Mes certificats
          </Link>

          <Link href="/dashboard/apprenant/profil" className={styles.navLink}>
            <User size={20} /> Mon profil
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <button type="button" className={styles.profileMiniButton} onClick={() => setShowProfil(true)}>
            <div className={styles.profileMini}>
              {photoAffichee ? (
                <img src={photoAffichee} alt="Profil" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatar}>{initiale}</div>
              )}
              <div className={styles.profileText}>
                <strong>{nomComplet || "Apprenant"}</strong>
                <small>Apprenant • Voir mon profil</small>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h2>Tableau de bord</h2>
            <p>Votre espace d&apos;apprentissage</p>
          </div>

          <button type="button" className={styles.topProfileButton} onClick={() => setShowProfil(true)}>
            <div className={styles.topProfile}>
              {photoAffichee ? (
                <img src={photoAffichee} alt="Profil" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatar}>{initiale}</div>
              )}
              <div className={styles.profileText}>
                <strong>{nomComplet || "Apprenant"}</strong>
                <small>Apprenant</small>
              </div>
            </div>
          </button>
        </header>

        <section className={styles.content}>
          <section className={styles.welcome}>
            <div className={styles.welcomeContent}>
              <span className={styles.welcomeTag}>ESPACE APPRENANT</span>
              <h1>Bonjour, {utilisateur.prenom || utilisateur.nom || "Apprenant"} !</h1>
              <p>
                Bienvenue sur votre espace Learning Pro.
                Continuez votre apprentissage et développez vos compétences.
              </p>
              <Link
                href="/dashboard/apprenant/formations"
                className={styles.primaryButton}
              >
                Découvrir les formations <ArrowRight size={18} />
              </Link>
            </div>

            <div className={styles.welcomeIllustration}>
              <GraduationCap size={72} />
            </div>
          </section>

          <div className={styles.sectionHeader}>
            <div>
              <h2>Vue d&apos;ensemble</h2>
              <p>Voici le résumé de votre apprentissage.</p>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {cartes.map((carte) => (
              <Link
                href={carte.lien}
                key={carte.titre}
                className={styles.statCard}
              >
                <div className={`${styles.statIcon} ${styles[carte.couleur]}`}>
                  {carte.icone}
                </div>
                <div className={styles.statInfo}>
                  <p>{carte.titre}</p>
                  <h2>{carte.valeur}</h2>
                </div>
                <span className={styles.statArrow}><ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>

          <div className={styles.bottomGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Formations disponibles</h2>
                  <p>Découvrez les formations proposées.</p>
                </div>
                <Link href="/dashboard/apprenant/formations">
                  Voir tout <span>→</span>
                </Link>
              </div>

              {formations.length > 0 ? (
                <div className={styles.formationList}>
                  {formations.slice(0, 4).map((formation, index) => (
                    <div
                      className={styles.formationItem}
                      key={formation.numFormation ?? index}
                    >
                      <div className={styles.formationIcon}><FileText size={20} /></div>
                      <div className={styles.formationInfo}>
                        <strong>{formation.titre}</strong>
                        <p>
                          {formation.description || "Aucune description disponible."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}><BookOpen size={44} /></span>
                  <strong>Aucune formation disponible</strong>
                  <p>Les nouvelles formations apparaîtront ici.</p>
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2>Activités récentes</h2>
                  <p>Vos dernières tentatives de quiz.</p>
                </div>
                <Link href="/dashboard/apprenant/resultats">
                  Voir tout <span>→</span>
                </Link>
              </div>

              {activitesRecentes.length > 0 ? (
                <div className={styles.activityList}>
                  {activitesRecentes.map((tentative, index) => (
                    <div
                      className={styles.activityItem}
                      key={tentative.idTentative ?? index}
                    >
                      <div className={styles.activityIcon}><FileText size={20} /></div>
                      <div className={styles.activityInfo}>
                        <strong>Quiz #{tentative.idQuiz ?? "—"}</strong>
                        <p>
                          {tentative.statut || "En cours"}
                          {" · "}
                          Score : {tentative.score ?? "Non disponible"}
                        </p>
                        <small>
                          {tentative.dateTentative
                            ? new Date(tentative.dateTentative).toLocaleDateString("fr-FR")
                            : "Date non disponible"}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}><FileText size={44} /></span>
                  <strong>Aucune activité récente</strong>
                  <p>Vos tentatives de quiz apparaîtront ici.</p>
                </div>
              )}
            </section>
          </div>

          <footer className={styles.footer}>
            © {new Date().getFullYear()} Learning Pro. Tous droits réservés.
          </footer>
        </section>
      </main>

      {/* POPUP PROFIL */}
      {showProfil && (
        <div className={styles.profilOverlay} onClick={() => setShowProfil(false)}>
          <div className={styles.profilModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.profilClose} onClick={() => setShowProfil(false)}>
              <X size={20} />
            </button>

            <div className={styles.profilHeader}>
              <div className={styles.profilPhotoWrap}>
                {photoAffichee ? (
                  <img src={photoAffichee} alt="Profil" className={styles.profilPhoto} />
                ) : (
                  <div className={styles.profilAvatar}>{initiale}</div>
                )}
                <button type="button" className={styles.profilCamera} onClick={() => fileRef.current?.click()}>
                  <Camera size={16} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={changerPhoto} />
              </div>
              <h2>{nomComplet || "Apprenant"}</h2>
              <span className={styles.profilRole}>Apprenant</span>
            </div>

            <div className={styles.profilInfos}>
              <div className={styles.profilRow}>
                <User size={18} />
                <div>
                  <small>Nom complet</small>
                  <strong>{nomComplet || "Non renseigné"}</strong>
                </div>
              </div>
              <div className={styles.profilRow}>
                <Mail size={18} />
                <div>
                  <small>Adresse email</small>
                  <strong>{utilisateur.email || "Non renseignée"}</strong>
                </div>
              </div>
              <div className={styles.profilRow}>
                <GraduationCap size={18} />
                <div>
                  <small>Rôle</small>
                  <strong>Apprenant</strong>
                </div>
              </div>
              <div className={styles.profilRow}>
                <Trophy size={18} />
                <div>
                  <small>Certificats obtenus</small>
                  <strong>{statistiques.nombreCertificats ?? 0}</strong>
                </div>
              </div>
            </div>

            <Link href="/dashboard/apprenant/profil" className={styles.profilFullButton}>
              Voir mon profil complet
            </Link>

            <button type="button" className={styles.profilLogout} onClick={deconnecter}>
              <LogOut size={18} /> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}