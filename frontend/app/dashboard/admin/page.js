"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

const API = "http://localhost:5000/api";

const iconPaths = {
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6",
  userPlus: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6",
  graduation: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 2 3 4 6 4s6-2 6-4v-5 M22 10v6",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z M9 12l2 2 4-4",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z M21 21l-4.35-4.35",
  arrow: "M5 12h14 M12 5l7 7-7 7",
  external: "M7 17 17 7 M7 7h10v10",
  logout: "M10 17l5-5-5-5 M15 12H3 M21 3v18",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "M18 6 6 18 M6 6l12 12",
  refresh: "M20 11a8 8 0 0 0-14-5L3 9 M3 3v6h6 M4 13a8 8 0 0 0 14 5l3-3 M21 21v-6h-6",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
};

function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name] || iconPaths.user} />
    </svg>
  );
}

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

function lirePayload(token) {
  try {
    const partie = token.split(".")[1];
    const base64 = partie.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

function lireNom(token) {
  const payload = lirePayload(token);

  return (
    payload.nomComplet ||
    [payload.prenom, payload.nom].filter(Boolean).join(" ") ||
    payload.nom ||
    payload.prenom ||
    "Administrateur"
  );
}

async function requete(url, token) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }

  return response.json();
}

function extraireListe(data) {
  if (Array.isArray(data)) return data;

  for (const key of ["utilisateurs", "users", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function nomUtilisateur(user) {
  return (
    `${user.prenom || ""} ${user.nom || ""}`.trim() ||
    user.nomComplet ||
    user.name ||
    "Utilisateur"
  );
}

function initiales(user) {
  const prenom = user.prenom || "";
  const nom = user.nom || "";

  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "U";
}

function formatDate(date) {
  if (!date) return "—";

  const valeur = new Date(date);
  if (isNaN(valeur.getTime())) return "—";

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(role) {
  switch ((role || "").toLowerCase()) {
    case "administrateur":
      return "Administrateur";
    case "formateur":
      return "Formateur";
    case "apprenant":
      return "Apprenant";
    default:
      return role || "Utilisateur";
  }
}

export default function AdminDashboard() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [adminName, setAdminName] = useState("Administrateur");
  const [chargement, setChargement] = useState(true);
  const [erreurUtilisateur, setErreurUtilisateur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [menuMobile, setMenuMobile] = useState(false);
  const [tokenPresent, setTokenPresent] = useState(false);

  async function chargerDashboard() {
    setChargement(true);
    setErreurUtilisateur("");

    const token = getToken();
    setTokenPresent(Boolean(token));

    if (token) {
      setAdminName(lireNom(token));
    }

    try {
      const data = await requete(`${API}/utilisateur`, token);
      setUtilisateurs(extraireListe(data));
    } catch {
      setUtilisateurs([]);
      setErreurUtilisateur(
        "Les utilisateurs n'ont pas pu être chargés. Vérifiez votre connexion au serveur."
      );
    }

    setChargement(false);
  }

  useEffect(() => {
    let actif = true;

    async function initialiser() {
      const token = getToken();
      setTokenPresent(Boolean(token));

      if (token) {
        setAdminName(lireNom(token));
      }

      try {
        const data = await requete(`${API}/utilisateur`, token);
        if (!actif) return;
        setUtilisateurs(extraireListe(data));
      } catch {
        if (!actif) return;
        setErreurUtilisateur(
          "Impossible de charger les utilisateurs. Vérifiez le serveur et votre session."
        );
      }

      if (actif) setChargement(false);
    }

    initialiser();

    return () => {
      actif = false;
    };
  }, []);

  const formateurs = utilisateurs.filter(
    (u) => (u.role || "").toLowerCase() === "formateur"
  );

  const apprenants = utilisateurs.filter(
    (u) => (u.role || "").toLowerCase() === "apprenant"
  );

  const utilisateursRecents = [...utilisateurs]
    .sort((a, b) => {
      const dateA = new Date(a.dateCreation || a.createdAt || 0);
      const dateB = new Date(b.dateCreation || b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  const utilisateursFiltres = utilisateursRecents.filter((u) =>
    nomUtilisateur(u).toLowerCase().includes(recherche.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(recherche.toLowerCase())
  );

  const statistiques = [
    {
      titre: "Utilisateurs",
      valeur: utilisateurs.length,
      description: "Total des comptes",
      icone: "users",
    },
    {
      titre: "Formateurs",
      valeur: formateurs.length,
      description: "Créateurs de formations",
      icone: "graduation",
    },
    {
      titre: "Apprenants",
      valeur: apprenants.length,
      description: "Membres inscrits",
      icone: "user",
    },
  ];

  function deconnexion() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/connexion";
  }

  return (
    <div className={styles.dashboard}>
      {menuMobile && (
        <div
          className={styles.overlay}
          onClick={() => setMenuMobile(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${menuMobile ? styles.sidebarOpen : ""}`}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Icon name="graduation" size={26} />
          </div>

          <div className={styles.logoText}>
            <h2>Learning Pro</h2>
            <span>Administration</span>
          </div>

          <button
            className={styles.closeSidebar}
            onClick={() => setMenuMobile(false)}
            aria-label="Fermer le menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.menuLabel}>MENU PRINCIPAL</div>

        <nav className={styles.navigation}>
          <Link href="/dashboard/admin" className={`${styles.navLink} ${styles.active}`}>
            <Icon name="dashboard" />
            <span>Tableau de bord</span>
          </Link>

          <Link href="/dashboard/admin/utilisateurs" className={styles.navLink}>
            <Icon name="users" />
            <span>Gestion utilisateurs</span>
          </Link>

          <Link href="/dashboard/admin/utilisateurs/ajouter" className={styles.navLink}>
            <Icon name="userPlus" />
            <span>Créer un formateur</span>
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.adminCard}>
            <div className={styles.adminAvatar}>
              <Icon name="shield" size={21} />
            </div>

            <div className={styles.adminInfo}>
              <strong>Administrateur</strong>
              <span>Gestion de plateforme</span>
            </div>
          </div>

          <button className={styles.logoutButton} onClick={deconnexion}>
            <Icon name="logout" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuMobileButton}
              onClick={() => setMenuMobile(true)}
              aria-label="Ouvrir le menu"
            >
              <Icon name="menu" />
            </button>

            <div>
              <span className={styles.headerSubtitle}>Administration</span>
              <h1>Tableau de bord</h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              className={styles.refreshButton}
              title="Actualiser"
              onClick={chargerDashboard}
              disabled={chargement}
            >
              <Icon name="refresh" />
            </button>

            <div className={styles.profile}>
              <div className={styles.profileAvatar}>
                <Icon name="user" size={22} />
              </div>

              <div className={styles.profileText}>
                <strong>{adminName}</strong>
                <span>Administrateur</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div className={styles.welcomeText}>
              <span className={styles.welcomeBadge}>
                <Icon name="shield" size={15} />
                Espace administration
              </span>

              <h2>Bienvenue, {adminName} !</h2>

              <p>
                Gérez les utilisateurs de votre plateforme Learning Pro.
              </p>

              <Link
                href="/dashboard/admin/utilisateurs"
                className={styles.welcomeButton}
              >
                Gérer les utilisateurs
                <Icon name="arrow" size={17} />
              </Link>
            </div>

            <div className={styles.welcomeIllustration}>
              <div className={styles.illustrationCircle}>
                <Icon name="graduation" size={65} />
              </div>

              <div className={styles.floatingIcon}>
                <Icon name="users" size={24} />
              </div>

              <div className={styles.floatingIconTwo}>
                <Icon name="userPlus" size={23} />
              </div>
            </div>
          </section>

          {!tokenPresent && (
            <div className={styles.errorMessage}>
              Aucun token de connexion n&apos;a été trouvé. Les données nécessitant une authentification ne seront pas disponibles. Vous pouvez néanmoins accéder à la page.
            </div>
          )}

          {erreurUtilisateur && (
            <div className={styles.errorMessage}>
              {erreurUtilisateur}
            </div>
          )}

          <section className={styles.statsSection}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Vue d&apos;ensemble</h2>
                <p>Les chiffres essentiels de votre plateforme</p>
              </div>
            </div>

            <div className={styles.statsGrid}>
              {statistiques.map((stat) => (
                <div className={styles.statCard} key={stat.titre}>
                  <div className={styles.statTop}>
                    <div className={styles.statIcon}>
                      <Icon name={stat.icone} size={23} />
                    </div>

                    <span className={styles.statNumber}>
                      {chargement ? "..." : stat.valeur}
                    </span>
                  </div>

                  <h3>{stat.titre}</h3>
                  <p>{stat.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.quickActions}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Actions rapides</h2>
                <p>Les opérations les plus utilisées</p>
              </div>
            </div>

            <div className={styles.actionGrid}>
              <Link
                href="/dashboard/admin/utilisateurs/ajouter"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>
                  <Icon name="userPlus" size={23} />
                </div>

                <div className={styles.actionText}>
                  <h3>Créer un formateur</h3>
                  <p>Ajouter un nouveau compte formateur</p>
                </div>

                <Icon name="external" size={19} />
              </Link>

              <Link
                href="/dashboard/admin/utilisateurs"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>
                  <Icon name="users" size={23} />
                </div>

                <div className={styles.actionText}>
                  <h3>Gérer les utilisateurs</h3>
                  <p>Consulter et gérer tous les comptes</p>
                </div>

                <Icon name="external" size={19} />
              </Link>
            </div>
          </section>

          <section className={styles.usersSection}>
            <div className={styles.usersHeader}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Utilisateurs récents</h2>
                  <p>Les derniers comptes enregistrés</p>
                </div>
              </div>

              <Link href="/dashboard/admin/utilisateurs" className={styles.viewAll}>
                Tout afficher
                <Icon name="arrow" size={16} />
              </Link>
            </div>

            <div className={styles.searchBox}>
              <Icon name="search" size={18} />

              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>

            <div className={styles.userList}>
              {chargement ? (
                <div className={styles.emptyState}>
                  <p>Chargement des utilisateurs...</p>
                </div>
              ) : utilisateursFiltres.length === 0 ? (
                <div className={styles.emptyState}>
                  <Icon name="users" size={25} />
                  <p>Aucun utilisateur trouvé.</p>
                </div>
              ) : (
                utilisateursFiltres.map((user, index) => (
                  <div
                    className={styles.userRow}
                    key={user.idUtilisateur || user.id || index}
                  >
                    <div className={styles.userIdentity}>
                      <div className={styles.userAvatar}>
                        {initiales(user)}
                      </div>

                      <div className={styles.userDetails}>
                        <strong>{nomUtilisateur(user)}</strong>
                        <span>{user.email || "Email indisponible"}</span>
                      </div>
                    </div>

                    <div className={styles.userMeta}>
                      <span
                        className={`${styles.roleBadge} ${
                          (user.role || "").toLowerCase() === "formateur"
                            ? styles.roleTrainer
                            : (user.role || "").toLowerCase() === "apprenant"
                            ? styles.roleLearner
                            : styles.roleAdmin
                        }`}
                      >
                        {roleLabel(user.role)}
                      </span>

                      <span className={styles.userDate}>
                        {formatDate(
                          user.dateCreation ||
                          user.createdAt ||
                          user.dateInscription
                        )}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <footer className={styles.footer}>
            <span>© 2026 Learning Pro</span>
            <span>Administration de la plateforme</span>
          </footer>
        </div>
      </main>
    </div>
  );
}