"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Users, Search, Plus, Pencil, Trash2, Mail, GraduationCap, User, RefreshCw,
} from "lucide-react";
import styles from "./utilisateur.module.css";
import { obtenirApiAdmin } from "@/lib/api";
const API = obtenirApiAdmin();

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

async function lireReponse(response) {
  try { return await response.json(); } catch { return {}; }
}

// CONFORME BACKEND : GET /api/admin/utilisateurs?search=&role=administrateur&limit=100
// FIX SWR : on ne déstructure plus la clé, on reçoit (recherche, roleFiltre) directement
async function chargerUtilisateurs(recherche = "", roleFiltre = "") {
  const token = getToken();
  if (!token) throw new Error("Session expirée. Veuillez vous reconnecter.");

  const params = new URLSearchParams({ limit: "100", page: "1", sortBy: "idUtilisateur", order: "DESC" });
  if (String(recherche || "").trim()) params.set("search", String(recherche).trim());
  // Backend attend administrateur en base, pas admin
  if (roleFiltre) params.set("role", roleFiltre === "admin" ? "administrateur" : roleFiltre);

  const response = await fetch(`${API}/utilisateurs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await lireReponse(response);
  if (!response.ok) {
    if (response.status === 403) throw new Error(`Accès interdit (403). Vérifie que tu es bien connecté en admin et que le backend est redéployé. | ${data.message || ""}`);
    throw new Error(`HTTP ${response.status} : ${data.message || "Impossible de charger les utilisateurs."}`);
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.utilisateurs)) return data.utilisateurs;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function getIdUtilisateur(user) { return user?.idUtilisateur ?? user?.id ?? user?.id_utilisateur ?? null; }

function nomUtilisateur(user) {
  const nom = (user.nom || "").trim().toUpperCase();
  let prenom = (user.prenom || "").trim();
  if (prenom) prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
  const complet = [nom, prenom].filter(Boolean).join(" ");
  return complet || user.nomComplet || user.name || "Utilisateur";
}

function initiales(user) {
  const prenom = user.prenom || "";
  const nom = user.nom || "";
  const value = `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
  return value.trim() || "U";
}

function formatDate(date) {
  if (!date) return "—";
  const valeur = new Date(date);
  if (Number.isNaN(valeur.getTime())) return "—";
  return valeur.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function roleLabel(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":
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

function roleNormalise(role) {
  const r = String(role || "").toLowerCase();
  if (r === "admin" || r === "administrateur") return "administrateur";
  return r;
}

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [roleFiltre, setRoleFiltre] = useState("");
  const [suppression, setSuppression] = useState(null);
  const [erreurSuppression, setErreurSuppression] = useState("");
  const [succesSuppression, setSuccesSuppression] = useState("");

  // FIX SWR : on passe une flèche () => chargerUtilisateurs(recherche, roleFiltre)
  // Avant, SWR envoyait ("admin-utilisateurs", recherche, roleFiltre) et la fonction
  // prenait [, recherche, roleFiltre] sur "admin-utilisateurs" -> recherche="d", role="m" -> 400 Rôle invalide
  const { data, error, isLoading, mutate } = useSWR(
    ["admin-utilisateurs", recherche, roleFiltre],
    () => chargerUtilisateurs(recherche, roleFiltre),
    { revalidateOnFocus: true, revalidateOnReconnect: true, shouldRetryOnError: false }
  );

  const utilisateurs = useMemo(() => data || [], [data]);

  const utilisateursFiltres = useMemo(() => {
    return [...utilisateurs].sort((a, b) => {
      const dateA = new Date(a.dateCreation || a.createdAt || a.dateInscription || 0);
      const dateB = new Date(b.dateCreation || b.createdAt || b.dateInscription || 0);
      return dateB - dateA;
    });
  }, [utilisateurs]);

  const totalFormateurs = useMemo(() => utilisateurs.filter((u) => roleNormalise(u.role) === "formateur").length, [utilisateurs]);
  const totalApprenants = useMemo(() => utilisateurs.filter((u) => roleNormalise(u.role) === "apprenant").length, [utilisateurs]);
  const totalAdmins = useMemo(() => utilisateurs.filter((u) => roleNormalise(u.role) === "administrateur").length, [utilisateurs]);

  const deconnexion = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
    localStorage.removeItem("user");
    router.push("/connexion");
  };

  const supprimerUtilisateur = async (user) => {
    const id = getIdUtilisateur(user);
    if (!id) { setErreurSuppression("Identifiant de l'utilisateur introuvable."); return; }
    const confirmation = window.confirm(`Voulez-vous vraiment supprimer ${nomUtilisateur(user)} ? Cette action est irréversible.`);
    if (!confirmation) return;
    try {
      setSuppression(id);
      setErreurSuppression("");
      setSuccesSuppression("");
      const token = getToken();
      if (!token) throw new Error("Session expirée. Veuillez vous reconnecter.");
      const response = await fetch(`${API}/utilisateurs/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await lireReponse(response);
      if (!response.ok) throw new Error(result.message || "La suppression a échoué.");
      setSuccesSuppression(result.message || "Utilisateur supprimé avec succès.");
      await mutate();
    } catch (err) {
      setErreurSuppression(err.message || "Impossible de supprimer cet utilisateur.");
    } finally {
      setSuppression(null);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={() => router.push("/dashboard/admin")}>← Retour</button>
        <span className={styles.pageTitle}>Utilisateurs</span>
        <span className={styles.topBarSpacer} />
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>ESPACE ADMIN</span>
            <h1>Gestion des utilisateurs</h1>
            <p>Consultez, créez, modifiez et supprimez les comptes de la plateforme.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/admin/utilisateurs/ajouter" className={styles.addButton}><Plus size={18} /> Ajouter un utilisateur</Link>
          </div>
        </header>

        <section className={styles.stats}>
          <article className={styles.statCard}><div className={styles.statIcon}><Users size={22} /></div><div><span>Total utilisateurs</span><strong>{utilisateurs.length}</strong></div></article>
          <article className={styles.statCard}><div className={styles.statIcon}><GraduationCap size={22} /></div><div><span>Formateurs</span><strong>{totalFormateurs}</strong></div></article>
          <article className={styles.statCard}><div className={styles.statIcon}><User size={22} /></div><div><span>Apprenants</span><strong>{totalApprenants}</strong></div></article>
          <article className={styles.statCard}><div className={styles.statIcon}><Search size={22} /></div><div><span>Admins</span><strong>{totalAdmins}</strong></div></article>
        </section>

        <section className={styles.content}>
          <div className={styles.contentHeader}>
            <div><h2>Liste des utilisateurs</h2><p>Retrouvez tous les comptes enregistrés.</p></div>
            <span className={styles.count}>{utilisateursFiltres.length} utilisateur(s)</span>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input type="search" placeholder="Rechercher par nom ou email..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            <select value={roleFiltre} onChange={(e) => setRoleFiltre(e.target.value)}>
              <option value="">Tous les rôles</option>
              <option value="administrateur">Administrateur</option>
              <option value="formateur">Formateur</option>
              <option value="apprenant">Apprenant</option>
            </select>
            <button type="button" className={styles.refreshButton} onClick={() => mutate()}><RefreshCw size={16} /> Actualiser</button>
          </div>

          {succesSuppression && <div className={styles.success}>{succesSuppression}</div>}
          {erreurSuppression && (
            <div className={styles.error}>
              <strong>Erreur de suppression</strong>
              <p>{erreurSuppression}</p>
              <button type="button" onClick={() => setErreurSuppression("")}>Fermer</button>
            </div>
          )}

          {isLoading ? (
            <div className={styles.state}><div className={styles.spinner}></div>Chargement des utilisateurs...</div>
          ) : error ? (
            <div className={styles.error}>
              <strong>Une erreur est survenue</strong>
              <p>{error.message}</p>
              <p className={styles.errorSmall}>API = {API}/utilisateurs</p>
              <div className={styles.errorActions}>
                <button type="button" onClick={() => mutate()}>Réessayer</button>
                <button type="button" onClick={deconnexion}>Se reconnecter en admin</button>
              </div>
            </div>
          ) : utilisateursFiltres.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><Users size={36} /></div>
              <h3>{utilisateurs.length === 0 ? "Aucun utilisateur pour le moment" : "Aucun utilisateur trouvé"}</h3>
              <p>{utilisateurs.length === 0 ? "Commencez par ajouter votre premier utilisateur." : "Essayez de modifier votre recherche ou votre filtre."}</p>
              {utilisateurs.length === 0 && <Link href="/dashboard/admin/utilisateurs/ajouter">Ajouter mon premier utilisateur</Link>}
            </div>
          ) : (
            <div className={styles.userGrid}>
              {utilisateursFiltres.map((user) => {
                const id = getIdUtilisateur(user);
                const rn = roleNormalise(user.role);
                return (
                  <article className={styles.userCard} key={id}>
                    <div className={styles.cardTop}>
                      <span className={styles.userAvatar}>{initiales(user)}</span>
                      <span className={`${styles.roleBadge} ${rn === "formateur" ? styles.roleTrainer : rn === "apprenant" ? styles.roleLearner : styles.roleAdmin}`}>{roleLabel(user.role)}</span>
                    </div>
                    <h3>{nomUtilisateur(user)}</h3>
                    <p className={styles.userEmail}><Mail size={14} /> {user.email || "Email indisponible"}</p>
                    <div className={styles.userMeta}><span>INSCRIT LE</span><strong>{formatDate(user.dateCreation || user.createdAt || user.dateInscription)}</strong></div>
                    <div className={styles.cardFooter}>
                      <Link href={`/dashboard/admin/utilisateurs/modifier?id=${encodeURIComponent(id)}`} className={styles.editButton}><Pencil size={16} /> Modifier</Link>
                      <button type="button" className={styles.deleteButton} onClick={() => supprimerUtilisateur(user)} disabled={suppression !== null}><Trash2 size={16} />{suppression === id ? "Suppression..." : "Supprimer"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <nav className={styles.bottomNav}>
        <Link href="/dashboard/admin" className={styles.bottomNavLink}>Tableau de bord</Link>
        <Link href="/dashboard/admin/utilisateurs" className={`${styles.bottomNavLink} ${styles.bottomNavActive}`}>Utilisateurs</Link>
        <Link href="/dashboard/admin/utilisateurs/ajouter" className={styles.bottomNavLink}>Ajouter</Link>
        <Link href="/dashboard/admin/profil" className={styles.bottomNavLink}>Profil</Link>
      </nav>
    </main>
  );
}