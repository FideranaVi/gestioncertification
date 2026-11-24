
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./apprenant.module.css";

const API = "http://localhost:5000/api/apprenant";

export default function ApprenantDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

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

  const cartes = [
    {
      titre: "Formations",
      valeur: statistiques.nombreFormations ?? 0,
      icone: "📚",
      couleur: "green",
      lien: "/dashboard/apprenant/formations"
    },
    {
      titre: "Modules",
      valeur: statistiques.nombreModules ?? 0,
      icone: "📖",
      couleur: "blue",
      lien: "/dashboard/apprenant/formations"
    },
    {
      titre: "Quiz",
      valeur: statistiques.nombreQuiz ?? 0,
      icone: "📝",
      couleur: "orange",
      lien: "/dashboard/apprenant/quiz"
    },
    {
      titre: "Quiz terminés",
      valeur: statistiques.tentativesTerminees ?? 0,
      icone: "✓",
      couleur: "purple",
      lien: "/dashboard/apprenant/resultats"
    },
    {
      titre: "Certificats",
      valeur: statistiques.nombreCertificats ?? 0,
      icone: "🏆",
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
            <span>▦</span> Tableau de bord
          </Link>

          <Link href="/dashboard/apprenant/formations" className={styles.navLink}>
            <span>📚</span> Mes formations
          </Link>

          <Link href="/dashboard/apprenant/quiz" className={styles.navLink}>
            <span>📝</span> Quiz
          </Link>

          <Link href="/dashboard/apprenant/resultats" className={styles.navLink}>
            <span>📊</span> Mes résultats
          </Link>

          <Link href="/dashboard/apprenant/certificats" className={styles.navLink}>
            <span>🏆</span> Mes certificats
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.profileMini}>
            <div className={styles.avatar}>{initiale}</div>
            <div className={styles.profileText}>
              <strong>{nomComplet || "Apprenant"}</strong>
              <small>Apprenant</small>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h2>Tableau de bord</h2>
            <p>Votre espace d&apos;apprentissage</p>
          </div>

          <div className={styles.topProfile}>
            <div className={styles.avatar}>{initiale}</div>
            <div className={styles.profileText}>
              <strong>{nomComplet || "Apprenant"}</strong>
              <small>Apprenant</small>
            </div>
          </div>
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
                Découvrir les formations <span>→</span>
              </Link>
            </div>

            <div className={styles.welcomeIllustration}>🎓</div>
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
                <span className={styles.statArrow}>→</span>
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
                  Voir tout →
                </Link>
              </div>

              {formations.length > 0 ? (
                <div className={styles.formationList}>
                  {formations.slice(0, 4).map((formation, index) => (
                    <div
                      className={styles.formationItem}
                      key={formation.numFormation ?? index}
                    >
                      <div className={styles.formationIcon}>📘</div>
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
                  <span>📚</span>
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
                  Voir tout →
                </Link>
              </div>

              {activitesRecentes.length > 0 ? (
                <div className={styles.activityList}>
                  {activitesRecentes.map((tentative, index) => (
                    <div
                      className={styles.activityItem}
                      key={tentative.idTentative ?? index}
                    >
                      <div className={styles.activityIcon}>📝</div>
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
                  <span>📝</span>
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
    </div>
  );
}
