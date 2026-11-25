"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Mail,
  ShieldCheck,
  GraduationCap,
  User,
  RefreshCw,
} from "lucide-react";
import styles from "./utilisateur.module.css";

import { obtenirApiAdmin } from "@/lib/api";
const API = obtenirApiAdmin();

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

async function lireReponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function chargerUtilisateurs() {
  const token = getToken();
  if (!token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  const response = await fetch(`${API}/utilisateurs`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await lireReponse(response);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} : ${data.message || "Impossible de charger les utilisateurs."}`
    );
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.utilisateurs)) return data.utilisateurs;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function nomUtilisateur(user) {
  const nom = (user.nom || "").trim().toUpperCase();
  let prenom = (user.prenom || "").trim();
  if (prenom) {
    prenom = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
  }
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
  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function AdminUtilisateursPage() {
  const [recherche, setRecherche] = useState("");
  const [roleFiltre, setRoleFiltre] = useState("");
  const [suppression, setSuppression] = useState(null);
  const [erreurSuppression, setErreurSuppression] = useState("");
  const [succesSuppression, setSuccesSuppression] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    "admin-utilisateurs",
    chargerUtilisateurs,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    }
  );

  const utilisateurs = useMemo(() => data || [], [data]);

  const utilisateursFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return utilisateurs
      .filter((user) => {
        const correspondRecherche =
          !terme ||
          nomUtilisateur(user).toLowerCase().includes(terme) ||
          (user.email || "").toLowerCase().includes(terme);
        const correspondRole =
          !roleFiltre || (user.role || "").toLowerCase() === roleFiltre.toLowerCase();
        return correspondRecherche && correspondRole;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dateCreation || a.createdAt || a.dateInscription || 0);
        const dateB = new Date(b.dateCreation || b.createdAt || b.dateInscription || 0);
        return dateB - dateA;
      });
  }, [utilisateurs, recherche, roleFiltre]);

  const totalFormateurs = useMemo(
    () => utilisateurs.filter((u) => (u.role || "").toLowerCase() === "formateur").length,
    [utilisateurs]
  );
  const totalApprenants = useMemo(
    () => utilisateurs.filter((u) => (u.role || "").toLowerCase() === "apprenant").length,
    [utilisateurs]
  );

  const supprimerUtilisateur = async (user) => {
    const id = user.idUtilisateur || user.id;
    if (!id) {
      setErreurSuppression("Identifiant de l'utilisateur introuvable.");
      return;
    }
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer ${nomUtilisateur(user)} ? Cette action est irréversible.`
    );
    if (!confirmation) return;
    try {
      setSuppression(id);
      setErreurSuppression("");
      setSuccesSuppression("");
      const token = getToken();
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      const response = await fetch(
        `${API}/utilisateurs/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await lireReponse(response);
      if (!response.ok) {
        throw new Error(result.message || "La suppression a échoué.");
      }
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
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>ESPACE ADMIN</span>
            <h1>Gestion des utilisateurs</h1>
            <p>Consultez, créez, modifiez et supprimez les comptes de la plateforme.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/dashboard/admin" className={styles.backButton}>
              <ArrowLeft size={18} /> Tableau de bord
            </Link>
            <Link href="/dashboard/admin/utilisateurs/ajouter" className={styles.addButton}>
              <Plus size={18} /> Ajouter un utilisateur
            </Link>
          </div>
        </header>

        <section className={styles.stats}>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><Users size={22} /></div>
            <div><span>Total utilisateurs</span><strong>{utilisateurs.length}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><GraduationCap size={22} /></div>
            <div><span>Formateurs</span><strong>{totalFormateurs}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><User size={22} /></div>
            <div><span>Apprenants</span><strong>{totalApprenants}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><Search size={22} /></div>
            <div><span>Utilisateurs affichés</span><strong>{utilisateursFiltres.length}</strong></div>
          </article>
        </section>

        <section className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <h2>Liste des utilisateurs</h2>
              <p>Retrouvez tous les comptes enregistrés.</p>
            </div>
            <span className={styles.count}>{utilisateursFiltres.length} utilisateur(s)</span>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input
                type="search"
                placeholder="Rechercher par nom ou email..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <select value={roleFiltre} onChange={(e) => setRoleFiltre(e.target.value)}>
              <option value="">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="formateur">Formateur</option>
              <option value="apprenant">Apprenant</option>
            </select>
            <button type="button" className={styles.refreshButton} onClick={() => mutate()}>
              <RefreshCw size={16} /> Actualiser
            </button>
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
            <div className={styles.state}>
              <div className={styles.spinner}></div>
              Chargement des utilisateurs...
            </div>
          ) : error ? (
            <div className={styles.error}>
              <strong>Une erreur est survenue</strong>
              <p>DEBUG: {error.message} | API={API}/utilisateurs</p>
              <button type="button" onClick={() => mutate()}>Réessayer</button>
            </div>
          ) : utilisateursFiltres.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><Users size={36} /></div>
              <h3>{utilisateurs.length === 0 ? "Aucun utilisateur pour le moment" : "Aucun utilisateur trouvé"}</h3>
              <p>
                {utilisateurs.length === 0
                  ? "Commencez par ajouter votre premier utilisateur."
                  : "Essayez de modifier votre recherche ou votre filtre."}
              </p>
              {utilisateurs.length === 0 && (
                <Link href="/dashboard/admin/utilisateurs/ajouter">Ajouter mon premier utilisateur</Link>
              )}
            </div>
          ) : (
            <div className={styles.userGrid}>
              {utilisateursFiltres.map((user) => {
                const id = user.idUtilisateur || user.id;
                return (
                  <article className={styles.userCard} key={id}>
                    <div className={styles.cardTop}>
                      <span className={styles.userAvatar}>{initiales(user)}</span>
                      <span className={`${styles.roleBadge} ${(user.role || "").toLowerCase() === "formateur" ? styles.roleTrainer : (user.role || "").toLowerCase() === "apprenant" ? styles.roleLearner : styles.roleAdmin}`}>
                        {roleLabel(user.role)}
                      </span>
                    </div>
                    <h3>{nomUtilisateur(user)}</h3>
                    <p className={styles.userEmail}>
                      <Mail size={14} /> {user.email || "Email indisponible"}
                    </p>
                    <div className={styles.userMeta}>
                      <span>INSCRIT LE</span>
                      <strong>{formatDate(user.dateCreation || user.createdAt || user.dateInscription)}</strong>
                    </div>
                    <div className={styles.cardFooter}>
                      <Link
                        href={`/dashboard/admin/utilisateurs/modifier?id=${encodeURIComponent(id)}`}
                        className={styles.editButton}
                      >
                        <Pencil size={16} /> Modifier
                      </Link>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => supprimerUtilisateur(user)}
                        disabled={suppression !== null}
                      >
                        <Trash2 size={16} />
                        {suppression === id ? "Suppression..." : "Supprimer"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <footer className={styles.footer}>Learning Pro · Espace admin</footer>
      </div>
    </main>
  );
}
