
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./utilisateur.module.css";

const API = "http://localhost:5000/api/utilisateur";

function Icon({ name, size = 18 }) {
  const icons = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
  };

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
      {icons[name]}
    </svg>
  );
}

async function lireReponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Réponse invalide du serveur." };
  }
}

function obtenirId(utilisateur) {
  return (
    utilisateur.idUtilisateur ??
    utilisateur.code_utilisateur ??
    utilisateur.id_utilisateur ??
    utilisateur.id
  );
}

function normaliserRole(role) {
  const valeur = String(role || "").toLowerCase().trim();

  if (["admin", "administrateur"].includes(valeur)) return "admin";
  if (["formateur"].includes(valeur)) return "formateur";
  if (["apprenant", "participant"].includes(valeur)) return "apprenant";

  return valeur;
}

function obtenirNomRole(role) {
  const roles = {
    admin: "Administrateur",
    formateur: "Formateur",
    apprenant: "Apprenant",
  };

  return roles[normaliserRole(role)] || role || "Non défini";
}

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreRole, setFiltreRole] = useState("tous");
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState(null);

  async function chargerUtilisateurs() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(API, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const data = await lireReponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.erreur ||
          "Impossible de charger les utilisateurs."
        );
      }

      const liste = Array.isArray(data)
        ? data
        : data.utilisateurs || data.data || data.users || [];

      if (!Array.isArray(liste)) {
        throw new Error("Format de données incorrect.");
      }

      setUtilisateurs(liste);
      setErreur("");
    } catch (error) {
      setErreur(error.message || "Erreur de connexion au serveur.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    let actif = true;

    async function charger() {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(API, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        const data = await lireReponse(response);

        if (!response.ok) {
          throw new Error(
            data.message ||
            data.erreur ||
            "Impossible de charger les utilisateurs."
          );
        }

        const liste = Array.isArray(data)
          ? data
          : data.utilisateurs || data.data || data.users || [];

        if (!Array.isArray(liste)) {
          throw new Error("Format de données incorrect.");
        }

        if (actif) {
          setUtilisateurs(liste);
          setErreur("");
        }
      } catch (error) {
        if (actif) {
          setErreur(error.message || "Erreur de connexion au serveur.");
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    charger();

    return () => {
      actif = false;
    };
  }, []);

  const utilisateursFiltres = useMemo(() => {
    const texte = recherche.toLowerCase().trim();

    return utilisateurs.filter((u) => {
      const nom = `${u.nom || ""} ${u.prenom || ""}`.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = normaliserRole(u.role);

      return (
        (nom.includes(texte) || email.includes(texte)) &&
        (filtreRole === "tous" || role === filtreRole)
      );
    });
  }, [utilisateurs, recherche, filtreRole]);

  const stats = useMemo(() => ({
    total: utilisateurs.length,
    administrateurs: utilisateurs.filter(
      (u) => normaliserRole(u.role) === "admin"
    ).length,
    formateurs: utilisateurs.filter(
      (u) => normaliserRole(u.role) === "formateur"
    ).length,
    apprenants: utilisateurs.filter(
      (u) => normaliserRole(u.role) === "apprenant"
    ).length,
  }), [utilisateurs]);

  async function supprimerUtilisateur(id) {
    if (!id) {
      setErreur("Identifiant utilisateur introuvable.");
      return;
    }

    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
      return;
    }

    try {
      setSuppression(id);
      setErreur("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || ""}`,
        },
      });

      const data = await lireReponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || data.erreur || "La suppression a échoué."
        );
      }

      setUtilisateurs((prev) =>
        prev.filter((u) => String(obtenirId(u)) !== String(id))
      );
    } catch (error) {
      setErreur(error.message || "Erreur pendant la suppression.");
    } finally {
      setSuppression(null);
    }
  }

  function classeRole(role) {
    const valeur = normaliserRole(role);

    if (valeur === "admin") return styles.admin;
    if (valeur === "formateur") return styles.formateur;

    return styles.apprenant;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>ESPACE ADMINISTRATEUR</span>
          <h1>Gestion des utilisateurs</h1>
          <p>Gérez les comptes et les accès de votre plateforme.</p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href="/dashboard/admin"
            className={styles.secondaryButton}
          >
            <Icon name="home" /> Tableau de bord
          </Link>

          <button
            className={styles.refreshButton}
            onClick={() => {
              setChargement(true);
              chargerUtilisateurs();
            }}
            type="button"
            disabled={chargement}
          >
            <Icon name="refresh" /> Actualiser
          </button>

          <Link
            href="/dashboard/admin/utilisateurs/ajouter"
            className={styles.addButton}
          >
            <Icon name="plus" /> Ajouter un utilisateur
          </Link>
        </div>
      </header>

      {erreur && (
        <div className={styles.error} role="alert">
          {erreur}
        </div>
      )}

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>
            <Icon name="users" size={23} />
          </div>
          <div>
            <span>Total utilisateurs</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>
            <Icon name="users" size={23} />
          </div>
          <div>
            <span>Administrateurs</span>
            <strong>{stats.administrateurs}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>
            <Icon name="users" size={23} />
          </div>
          <div>
            <span>Formateurs</span>
            <strong>{stats.formateurs}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.iconOrange}`}>
            <Icon name="users" size={23} />
          </div>
          <div>
            <span>Apprenants</span>
            <strong>{stats.apprenants}</strong>
          </div>
        </article>
      </section>

      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>Liste des utilisateurs</h2>
            <p>Consultez, modifiez ou supprimez les comptes.</p>
          </div>

          <span className={styles.count}>
            {utilisateursFiltres.length} résultat(s)
          </span>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Icon name="search" />

            <input
              type="search"
              placeholder="Rechercher un nom ou un email..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>

          <select
            value={filtreRole}
            onChange={(e) => setFiltreRole(e.target.value)}
          >
            <option value="tous">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="formateur">Formateur</option>
            <option value="apprenant">Apprenant</option>
          </select>
        </div>

        {chargement ? (
          <div className={styles.loading}>
            <span className={styles.spinner}></span>
            <p>Chargement des utilisateurs...</p>
          </div>
        ) : utilisateursFiltres.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="users" size={38} />
            <h3>Aucun utilisateur trouvé</h3>
            <p>
              Essayez une autre recherche ou ajoutez un utilisateur.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Adresse email</th>
                  <th>Rôle</th>
                  <th className={styles.actionsHeading}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {utilisateursFiltres.map((u) => {
                  const id = obtenirId(u);

                  return (
                    <tr key={id}>
                      <td>
                        <div className={styles.user}>
                          <div className={styles.avatar}>
                            {(u.nom || "U").charAt(0).toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {u.nom || ""} {u.prenom || ""}
                            </strong>
                            <small>Compte #{id}</small>
                          </div>
                        </div>
                      </td>

                      <td className={styles.email}>
                        {u.email || "Non renseigné"}
                      </td>

                      <td>
                        <span
                          className={`${styles.role} ${classeRole(u.role)}`}
                        >
                          {obtenirNomRole(u.role)}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actions}>
                          <Link
                            href={`/dashboard/admin/utilisateurs/modifier?id=${id}`}
                            className={styles.editButton}
                            title="Modifier cet utilisateur"
                          >
                            <Icon name="edit" /> Modifier
                          </Link>

                          <button
                            type="button"
                            className={styles.deleteButton}
                            disabled={suppression === id}
                            onClick={() => supprimerUtilisateur(id)}
                          >
                            <Icon name="trash" />
                            {suppression === id
                              ? "Suppression..."
                              : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        Learning Pro · Administration
      </footer>
    </main>
  );
}
