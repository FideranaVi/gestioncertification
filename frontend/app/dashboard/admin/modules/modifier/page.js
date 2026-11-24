
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./modifier.module.css";

const API = "http://localhost:5000/api/module";

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Une erreur est survenue.");
  }

  return data;
}

function Icon({ name, size = 20 }) {
  const icons = {
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    graduation: (
      <>
        <path d="m22 10-10 5L2 10l10-5 10 5Z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <path d="M22 10v6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    plus: <path d="M12 5v14M5 12h14" />,
    back: <path d="m15 18-6-6 6-6" />
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

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [formations, setFormations] = useState([]);
  const [stats, setStats] = useState({ total: 0 });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState("");
  const [sortBy, setSortBy] = useState("ordre");
  const [order, setOrder] = useState("ASC");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;

    async function chargerDonnees() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          search,
          page: String(page),
          limit: "10",
          sortBy,
          order
        });

        if (formationFilter) {
          params.set("numFormation", formationFilter);
        }

        const [moduleData, formationData, statsData] = await Promise.all([
          apiRequest(`${API}?${params.toString()}`),
          apiRequest(`${API}/formations`),
          apiRequest(`${API}/statistiques`)
        ]);

        if (!active) return;

        setModules(
          Array.isArray(moduleData.modules) ? moduleData.modules : []
        );

        setFormations(
          Array.isArray(formationData)
            ? formationData
            : Array.isArray(formationData.formations)
              ? formationData.formations
              : []
        );

        setStats({
          total: Number(statsData.total || 0)
        });

        if (moduleData.pagination) {
          setPagination(moduleData.pagination);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Impossible de charger les modules.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    chargerDonnees();

    return () => {
      active = false;
    };
  }, [search, formationFilter, page, sortBy, order, refresh]);

  function rechercher(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function reinitialiserFiltres() {
    setSearchInput("");
    setSearch("");
    setFormationFilter("");
    setSortBy("ordre");
    setOrder("ASC");
    setPage(1);
  }

  async function supprimerModule() {
    if (deleteId === null) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");
      setOpenMenu(null);

      await apiRequest(`${API}/${deleteId}`, {
        method: "DELETE"
      });

      setDeleteId(null);
      setSuccess("Le module a été supprimé avec succès.");

      if (modules.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefresh((value) => value + 1);
      }
    } catch (err) {
      setError(err.message || "La suppression a échoué.");
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Number(pagination.totalPages || 1));

  function obtenirFormation(module) {
    return (
      module.formation?.titre ||
      formations.find(
        (formation) =>
          String(formation.numFormation) === String(module.numFormation)
      )?.titre ||
      `Formation #${module.numFormation || "—"}`
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.topNavigation}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <Icon name="back" size={17} />
          Dashboard administrateur
        </Link>

        <span className={styles.breadcrumb}>
          Administration <span>/</span> Modules
        </span>
      </div>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            GESTION PÉDAGOGIQUE
          </div>

          <h1>Modules de formation</h1>

          <p>
            Organisez les contenus pédagogiques et gérez les modules de vos
            formations.
          </p>
        </div>

        <Link
          href="/dashboard/admin/modules/ajouter"
          className={styles.addButton}
        >
          <Icon name="plus" size={19} />
          Nouveau module
        </Link>
      </header>

      {error && (
        <div className={styles.alertError}>
          <span>!</span>
          {error}
          <button onClick={() => setError("")} type="button">×</button>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess}>
          <span>✓</span>
          {success}
          <button onClick={() => setSuccess("")} type="button">×</button>
        </div>
      )}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.greenIcon}`}>
            <Icon name="book" size={23} />
          </div>
          <div className={styles.statInfo}>
            <span>Total des modules</span>
            <strong>{stats.total}</strong>
            <small>Modules enregistrés</small>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blueIcon}`}>
            <Icon name="layers" size={23} />
          </div>
          <div className={styles.statInfo}>
            <span>Modules affichés</span>
            <strong>{modules.length}</strong>
            <small>Sur cette page</small>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orangeIcon}`}>
            <Icon name="graduation" size={23} />
          </div>
          <div className={styles.statInfo}>
            <span>Formations disponibles</span>
            <strong>{formations.length}</strong>
            <small>Formations enregistrées</small>
          </div>
        </article>
      </section>

      <section className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Catalogue des modules</h2>
            <p>Consultez et gérez les modules de votre plateforme.</p>
          </div>

          <span className={styles.resultCount}>
            {pagination.total ?? 0} module(s)
          </span>
        </div>

        <form onSubmit={rechercher} className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Icon name="search" size={19} />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher par nom ou code..."
            />
          </div>

          <select
            value={formationFilter}
            onChange={(event) => {
              setPage(1);
              setFormationFilter(event.target.value);
            }}
          >
            <option value="">Toutes les formations</option>
            {formations.map((formation) => (
              <option
                key={formation.numFormation}
                value={formation.numFormation}
              >
                {formation.titre}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => {
              setPage(1);
              setSortBy(event.target.value);
            }}
          >
            <option value="ordre">Ordre</option>
            <option value="titreModule">Titre</option>
            <option value="codeModule">Code</option>
            <option value="numFormation">Formation</option>
          </select>

          <button type="submit" className={styles.filterButton}>
            Rechercher
          </button>

          <button
            type="button"
            className={styles.resetButton}
            onClick={reinitialiserFiltres}
            title="Réinitialiser les filtres"
          >
            Réinitialiser
          </button>
        </form>

        <div className={styles.sortBar}>
          <span>Tri des résultats :</span>

          <button
            type="button"
            className={order === "ASC" ? styles.activeSort : ""}
            onClick={() => {
              setPage(1);
              setOrder("ASC");
            }}
          >
            Croissant ↑
          </button>

          <button
            type="button"
            className={order === "DESC" ? styles.activeSort : ""}
            onClick={() => {
              setPage(1);
              setOrder("DESC");
            }}
          >
            Décroissant ↓
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Chargement du catalogue...</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>IDENTIFIANT</th>
                    <th>MODULE</th>
                    <th>FORMATION ASSOCIÉE</th>
                    <th>ORDRE</th>
                    <th>DESCRIPTION</th>
                    <th className={styles.actionHeading}>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {modules.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.empty}>
                        <div className={styles.emptyIcon}>
                          <Icon name="book" size={30} />
                        </div>
                        <strong>Aucun module trouvé</strong>
                        <p>
                          Essayez de modifier vos filtres ou créez un nouveau
                          module.
                        </p>
                        <Link
                          href="/dashboard/admin/modules/ajouter"
                          className={styles.emptyButton}
                        >
                          <Icon name="plus" size={16} />
                          Créer un module
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    modules.map((module) => (
                      <tr key={module.codeModule}>
                        <td>
                          <span className={styles.moduleId}>
                            #{module.codeModule}
                          </span>
                        </td>

                        <td>
                          <div className={styles.moduleCell}>
                            <div className={styles.moduleIcon}>
                              <Icon name="book" size={19} />
                            </div>
                            <div>
                              <strong>{module.titreModule}</strong>
                              <span>Module pédagogique</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.formationCell}>
                            <Icon name="graduation" size={16} />
                            <span>{obtenirFormation(module)}</span>
                          </div>
                        </td>

                        <td>
                          <span className={styles.orderBadge}>
                            {module.ordre ?? "—"}
                          </span>
                        </td>

                        <td>
                          <span className={styles.description}>
                            {module.descriptionModule || "Non renseignée"}
                          </span>
                        </td>

                        <td>
                          <div className={styles.actionContainer}>
                            <button
                              type="button"
                              className={styles.moreButton}
                              aria-label={`Actions pour ${module.titreModule}`}
                              aria-expanded={openMenu === module.codeModule}
                              onClick={() =>
                                setOpenMenu(
                                  openMenu === module.codeModule
                                    ? null
                                    : module.codeModule
                                )
                              }
                            >
                              <Icon name="more" size={20} />
                            </button>

                            {openMenu === module.codeModule && (
                              <div className={styles.actionMenu}>
                                <Link
                                  href={`/dashboard/admin/modules/modifier?id=${module.codeModule}`}
                                  onClick={() => setOpenMenu(null)}
                                >
                                  <Icon name="edit" size={16} />
                                  Modifier
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenu(null);
                                    setDeleteId(module.codeModule);
                                  }}
                                >
                                  <Icon name="trash" size={16} />
                                  Supprimer
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>
                Affichage de {modules.length} module(s) sur{" "}
                {pagination.total ?? 0}
              </span>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Précédent
                </button>

                <span className={styles.currentPage}>
                  {pagination.page || page}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {deleteId !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>
              <Icon name="trash" size={25} />
            </div>

            <h2>Supprimer le module ?</h2>

            <p>
              Cette opération est définitive. Le module sélectionné sera
              supprimé de la plateforme.
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModal}
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Annuler
              </button>

              <button
                type="button"
                className={styles.confirmDelete}
                onClick={supprimerModule}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
