"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  GraduationCap,
  ShieldCheck,
  Search,
  ArrowRight,
  ExternalLink,
  LogOut,
  Menu,
  X,
  RefreshCw,
  User,
  Mail,
  ChevronRight,
  Camera,
} from "lucide-react";
import styles from "./admin.module.css";

const API = "http://localhost:5000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
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

function lireUtilisateurStocke() {
  try {
    const brut =
      localStorage.getItem("utilisateur") ||
      localStorage.getItem("user") ||
      sessionStorage.getItem("utilisateur") ||
      sessionStorage.getItem("user");
    if (!brut) return {};
    return JSON.parse(brut) || {};
  } catch {
    return {};
  }
}

async function requete(url, token) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
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

function initialesDe(nomComplet) {
  if (!nomComplet) return "A";
  return nomComplet
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join("");
}

function initiales(user) {
  const prenom = user.prenom || "";
  const nom = user.nom || "";
  const value = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  return value || "U";
}

function formatDate(date) {
  if (!date) return "—";
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "—";
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
  const [admin, setAdmin] = useState({
    nom: "Administrateur",
    email: "",
    photo: "",
    role: "Administrateur",
  });
  const [chargement, setChargement] = useState(true);
  const [erreurUtilisateur, setErreurUtilisateur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [menuMobile, setMenuMobile] = useState(false);
  const [tokenPresent, setTokenPresent] = useState(false);
  const [menuProfil, setMenuProfil] = useState(false);

  function construireProfilAdmin(token) {
    const payload = token ? lirePayload(token) : {};
    const stocke = lireUtilisateurStocke();
    const nom =
      payload.nomComplet ||
      [payload.prenom, payload.nom].filter(Boolean).join(" ") ||
      [stocke.prenom, stocke.nom].filter(Boolean).join(" ") ||
      stocke.nomComplet ||
      stocke.nom ||
      "Administrateur";
    const email =
      payload.email || stocke.email || localStorage.getItem("email") || "";
    const photo =
      stocke.photo ||
      stocke.photoProfil ||
      stocke.avatar ||
      payload.photo ||
      payload.photoProfil ||
      localStorage.getItem("photoProfil") ||
      "";
    setAdmin({
      nom,
      email,
      photo,
      role: payload.role || stocke.role || "Administrateur",
    });
  }

  async function chargerDashboard() {
    setChargement(true);
    setErreurUtilisateur("");
    const token = getToken();
    setTokenPresent(Boolean(token));
    if (token) construireProfilAdmin(token);
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
      if (token) construireProfilAdmin(token);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const utilisateursFiltres = utilisateursRecents.filter(
    (u) =>
      nomUtilisateur(u).toLowerCase().includes(recherche.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(recherche.toLowerCase())
  );

  const statistiques = [
    {
      titre: "Utilisateurs",
      valeur: utilisateurs.length,
      description: "Total des comptes",
      icone: Users,
    },
    {
      titre: "Formateurs",
      valeur: formateurs.length,
      description: "Créateurs de formations",
      icone: GraduationCap,
    },
    {
      titre: "Apprenants",
      valeur: apprenants.length,
      description: "Membres inscrits",
      icone: User,
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
        <div className={styles.overlay} onClick={() => setMenuMobile(false)} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`${styles.sidebar} ${
          menuMobile ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <GraduationCap size={26} />
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
            <X size={20} />
          </button>
        </div>

        {/* ===== PROFIL ADMIN - SIDEBAR ===== */}
        <Link href="/dashboard/admin/profil" className={styles.profilSidebar}>
          {admin.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={admin.photo}
              alt={admin.nom}
              className={styles.profilSidebarPhoto}
            />
          ) : (
            <div className={styles.profilSidebarAvatar}>
              {initialesDe(admin.nom)}
            </div>
          )}
          <div className={styles.profilSidebarInfos}>
            <strong>{admin.nom}</strong>
            <span className={styles.profilSidebarRole}>
              <ShieldCheck size={13} /> Administrateur
            </span>
            <span className={styles.profilSidebarEmail}>
              {admin.email || "Email indisponible"}
            </span>
          </div>
          <ChevronRight size={16} className={styles.profilSidebarFleche} />
        </Link>

        <div className={styles.menuLabel}>MENU PRINCIPAL</div>

        <nav className={styles.navigation}>
          <Link
            href="/dashboard/admin"
            className={`${styles.navLink} ${styles.active}`}
          >
            <LayoutDashboard size={20} />
            <span>Tableau de bord</span>
          </Link>
          <Link
            href="/dashboard/admin/utilisateurs"
            className={styles.navLink}
          >
            <Users size={20} />
            <span>Gestion utilisateurs</span>
          </Link>
          <Link
            href="/dashboard/admin/utilisateurs/ajouter"
            className={styles.navLink}
          >
            <UserPlus size={20} />
            <span>Créer un formateur</span>
          </Link>
          <Link href="/dashboard/admin/profil" className={styles.navLink}>
            <User size={20} />
            <span>Mon profil</span>
          </Link>
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.adminCard}>
            <div className={styles.adminAvatar}>
              <ShieldCheck size={21} />
            </div>
            <div className={styles.adminInfo}>
              <strong>Administrateur</strong>
              <span>Gestion de plateforme</span>
            </div>
          </div>
          <button className={styles.logoutButton} onClick={deconnexion}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuMobileButton}
              onClick={() => setMenuMobile(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
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
              <RefreshCw size={18} />
            </button>

            {/* ===== PROFIL ADMIN - HEADER ===== */}
            <div className={styles.profileWrap}>
              <button
                type="button"
                className={styles.profile}
                onClick={() => setMenuProfil((v) => !v)}
              >
                {admin.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={admin.photo}
                    alt={admin.nom}
                    className={styles.profilePhoto}
                  />
                ) : (
                  <div className={styles.profileAvatar}>
                    {initialesDe(admin.nom)}
                  </div>
                )}
                <div className={styles.profileText}>
                  <strong>{admin.nom}</strong>
                  <span>Administrateur</span>
                </div>
              </button>

              {menuProfil && (
                <div className={styles.profileMenu}>
                  <div className={styles.profileMenuHead}>
                    {admin.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={admin.photo}
                        alt={admin.nom}
                        className={styles.profileMenuPhoto}
                      />
                    ) : (
                      <div className={styles.profileMenuAvatar}>
                        {initialesDe(admin.nom)}
                      </div>
                    )}
                    <div>
                      <strong>{admin.nom}</strong>
                      <span>
                        <Mail size={12} /> {admin.email || "Email indisponible"}
                      </span>
                      <span>
                        <ShieldCheck size={12} /> Administrateur
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/admin/profil"
                    className={styles.profileMenuLink}
                    onClick={() => setMenuProfil(false)}
                  >
                    <User size={17} /> Voir mon profil
                  </Link>
                  <button
                    type="button"
                    className={styles.profileMenuLogout}
                    onClick={deconnexion}
                  >
                    <LogOut size={17} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {/* ===== BIENVENUE + PROFIL ===== */}
          <section className={styles.welcome}>
            <div className={styles.welcomeText}>
              <span className={styles.welcomeBadge}>
                <ShieldCheck size={15} />
                Espace administration
              </span>
              <h2>Bienvenue, {admin.nom} !</h2>
              <p>Gérez les utilisateurs de votre plateforme Learning Pro.</p>
              <div className={styles.welcomeProfil}>
                {admin.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={admin.photo}
                    alt={admin.nom}
                    className={styles.welcomePhoto}
                  />
                ) : (
                  <div className={styles.welcomeAvatar}>
                    {initialesDe(admin.nom)}
                  </div>
                )}
                <div className={styles.welcomeProfilInfos}>
                  <strong>{admin.nom}</strong>
                  <span>
                    <Mail size={13} /> {admin.email || "Email indisponible"}
                  </span>
                  <span>
                    <ShieldCheck size={13} /> Administrateur • Compte vérifié
                  </span>
                </div>
              </div>
              <div className={styles.welcomeActions}>
                <Link
                  href="/dashboard/admin/utilisateurs"
                  className={styles.welcomeButton}
                >
                  Gérer les utilisateurs
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/dashboard/admin/profil"
                  className={styles.welcomeButtonSecondary}
                >
                  <User size={17} /> Mon profil
                </Link>
              </div>
            </div>

            <div className={styles.welcomeIllustration}>
              <div className={styles.illustrationCircle}>
                <GraduationCap size={65} />
              </div>
              <div className={styles.floatingIcon}>
                <Users size={24} />
              </div>
              <div className={styles.floatingIconTwo}>
                <UserPlus size={23} />
              </div>
            </div>
          </section>

          {!tokenPresent && (
            <div className={styles.errorMessage}>
              Aucun token de connexion n&apos;a été trouvé. Les données
              nécessitant une authentification ne seront pas disponibles. Vous
              pouvez néanmoins accéder à la page.
            </div>
          )}

          {erreurUtilisateur && (
            <div className={styles.errorMessage}>{erreurUtilisateur}</div>
          )}

          {/* ===== STATS ===== */}
          <section className={styles.statsSection}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Vue d&apos;ensemble</h2>
                <p>Les chiffres essentiels de votre plateforme</p>
              </div>
            </div>
            <div className={styles.statsGrid}>
              {statistiques.map((stat) => {
                const Icone = stat.icone;
                return (
                  <div className={styles.statCard} key={stat.titre}>
                    <div className={styles.statTop}>
                      <div className={styles.statIcon}>
                        <Icone size={23} />
                      </div>
                      <span className={styles.statNumber}>
                        {chargement ? "..." : stat.valeur}
                      </span>
                    </div>
                    <h3>{stat.titre}</h3>
                    <p>{stat.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== ACTIONS RAPIDES ===== */}
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
                  <UserPlus size={23} />
                </div>
                <div className={styles.actionText}>
                  <h3>Créer un formateur</h3>
                  <p>Ajouter un nouveau compte formateur</p>
                </div>
                <ExternalLink size={19} />
              </Link>
              <Link
                href="/dashboard/admin/utilisateurs"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>
                  <Users size={23} />
                </div>
                <div className={styles.actionText}>
                  <h3>Gérer les utilisateurs</h3>
                  <p>Consulter et gérer tous les comptes</p>
                </div>
                <ExternalLink size={19} />
              </Link>
            </div>
          </section>

          {/* ===== UTILISATEURS RÉCENTS ===== */}
          <section className={styles.usersSection}>
            <div className={styles.usersHeader}>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>Utilisateurs récents</h2>
                  <p>Les derniers comptes enregistrés</p>
                </div>
              </div>
              <Link
                href="/dashboard/admin/utilisateurs"
                className={styles.viewAll}
              >
                Tout afficher
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.searchBox}>
              <Search size={18} />
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
                  <Users size={25} />
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