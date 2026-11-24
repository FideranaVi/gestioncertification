
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./modules.module.css";

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

export default function ModulesPage() {
  const [modules, setModules] = useState([]);
  const [formations, setFormations] = useState([]);
  const [stats, setStats] = useState({ total: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
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
            : formationData.formations || []
        );

        setStats({
          total: Number(statsData.total || 0)
        });

        setPagination(
          moduleData.pagination || {
            page,
            totalPages: 1,
            total: 0
          }
        );
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

  async function supprimerModule() {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      await apiRequest(`${API}/${deleteId}`, {
        method: "DELETE"
      });

      setDeleteId(null);
      setSuccess("Module supprimé avec succès.");

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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.backDashboard}>
            <span>←</span> Retour au dashboard
          </Link>

          <span className={styles.eyebrow}>ESPACE ADMINISTRATEUR</span>
          <h1>Gestion des modules</h1>
          <p>Organisez et gérez les modules de vos formations.</p>
        </div>

        <Link
          href="/dashboard/admin/modules/ajouter"
          className={styles.addButton}
        >
          <span>+</span> Ajouter un module
        </Link>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statIcon}>▤</div>
          <div>
            <span>Total des modules</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statIcon}>☷</div>
          <div>
            <span>Modules affichés</span>
            <strong>{modules.length}</strong>
          </div>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statIcon}>▣</div>
          <div>
            <span>Formations disponibles</span>
            <strong>{formations.length}</strong>
          </div>
        </article>
      </section>

      <section className={styles.content}>
        <div className={styles.contentHeader}>
          <div>
            <h2>Liste des modules</h2>
            <p>Recherchez et gérez les modules enregistrés.</p>
          </div>
          <span className={styles.count}>
            {pagination.total ?? 0} résultat(s)
          </span>
        </div>

        <form onSubmit={rechercher} className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un module..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

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
            <option value="ordre">Trier par ordre</option>
            <option value="titreModule">Trier par titre</option>
            <option value="codeModule">Trier par code</option>
            <option value="numFormation">Trier par formation</option>
          </select>

          <select
            value={order}
            onChange={(event) => {
              setPage(1);
              setOrder(event.target.value);
            }}
          >
            <option value="ASC">Croissant</option>
            <option value="DESC">Décroissant</option>
          </select>

          <button type="submit" className={styles.searchButton}>
            Rechercher
          </button>
        </form>

        {loading ? (
          <div className={styles.loading}>Chargement des modules...</div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>MODULE</th>
                    <th>DESCRIPTION</th>
                    <th>ORDRE</th>
                    <th>FORMATION</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {modules.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.empty}>
                        Aucun module trouvé.
                      </td>
                    </tr>
                  ) : (
                    modules.map((module) => {
                      const formation = formations.find(
                        (item) =>
                          String(item.numFormation) ===
                          String(module.numFormation)
                      );

                      return (
                        <tr key={module.codeModule}>
                          <td>
                            <span className={styles.code}>
                              #{module.codeModule}
                            </span>
                          </td>

                          <td className={styles.moduleName}>
                            {module.titreModule}
                          </td>

                          <td className={styles.description}>
                            {module.descriptionModule || "Aucune description"}
                          </td>

                          <td>
                            <span className={styles.orderBadge}>
                              {module.ordre ?? "—"}
                            </span>
                          </td>

                          <td>
                            {module.formation?.titre ||
                              formation?.titre ||
                              module.numFormation ||
                              "—"}
                          </td>

                          <td>
                            <div className={styles.actions}>
                              <Link
                                href={`/dashboard/admin/modules/modifier?id=${module.codeModule}`}
                                className={styles.editButton}
                              >
                                Modifier
                              </Link>

                              <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={() => setDeleteId(module.codeModule)}
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <span>
                Page {pagination.page || page} sur {totalPages}
              </span>

              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  ← Précédent
                </button>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {deleteId !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalIcon}>!</div>
            <h2>Supprimer ce module ?</h2>
            <p>
              Cette action est définitive. Voulez-vous vraiment supprimer ce
              module ?
            </p>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={supprimerModule}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
