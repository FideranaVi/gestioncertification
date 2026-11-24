"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BookOpen, Layers, Search, ChevronDown, ChevronRight, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import styles from "./module.module.css";

const API = "http://localhost:5000/api/formateur";

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

async function chargerDonnees() {
  const token = getToken();
  if (!token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  const [modulesRes, formationsRes] = await Promise.all([
    fetch(`${API}/modules`, { headers, cache: "no-store" }),
    fetch(`${API}/formations`, { headers, cache: "no-store" }),
  ]);
  const [modulesData, formationsData] = await Promise.all([
    lireReponse(modulesRes),
    lireReponse(formationsRes),
  ]);
  if (!modulesRes.ok) {
    throw new Error(modulesData.message || "Impossible de charger les modules.");
  }
  if (!formationsRes.ok) {
    throw new Error(formationsData.message || "Impossible de charger les formations.");
  }
  return {
    modules: Array.isArray(modulesData) ? modulesData : modulesData.modules || [],
    formations: Array.isArray(formationsData) ? formationsData : formationsData.formations || [],
  };
}

export default function ModulesPage() {
  const [recherche, setRecherche] = useState("");
  const [formationFiltre, setFormationFiltre] = useState("");
  const [suppression, setSuppression] = useState(null);
  const [erreurSuppression, setErreurSuppression] = useState("");
  const [succesSuppression, setSuccesSuppression] = useState("");

  // ✅ REGROUPEMENT : formations ouvertes par défaut
  const [formationsOuvertes, setFormationsOuvertes] = useState(() => new Set());

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR("formateur-modules-et-formations", chargerDonnees, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });

  const modules = data?.modules || [];
  const formations = data?.formations || [];

  const modulesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return modules
      .filter((module) => {
        const titre = (module.titreModule || "").toLowerCase();
        const description = (module.descriptionModule || "").toLowerCase();
        const formation = formations.find(
          (item) => String(item.numFormation) === String(module.numFormation)
        );
        const titreFormation = (formation?.titre || "").toLowerCase();
        const correspondRecherche =
          !terme ||
          titre.includes(terme) ||
          description.includes(terme) ||
          titreFormation.includes(terme);
        const correspondFormation =
          !formationFiltre ||
          String(module.numFormation) === String(formationFiltre);
        return correspondRecherche && correspondFormation;
      })
      .sort((a, b) => {
        if (String(a.numFormation) === String(b.numFormation)) {
          return (Number(a.ordre) || 0) - (Number(b.ordre) || 0);
        }
        return Number(a.numFormation) - Number(b.numFormation);
      });
  }, [modules, formations, recherche, formationFiltre]);

  // ✅ REGROUPEMENT : modules regroupés par formation
  const groupesParFormation = useMemo(() => {
    const groupes = new Map();

    // On crée d'abord un groupe pour chaque formation, même sans module
    formations.forEach((formation) => {
      // Si un filtre formation est actif, on ne garde que celle-là
      if (formationFiltre && String(formation.numFormation) !== String(formationFiltre)) return;
      groupes.set(String(formation.numFormation), {
        formation,
        modules: [],
      });
    });

    // On répartit les modules filtrés dans leur groupe
    modulesFiltres.forEach((module) => {
      const key = String(module.numFormation);
      if (!groupes.has(key)) {
        const formation = formations.find((f) => String(f.numFormation) === key);
        groupes.set(key, {
          formation: formation || { numFormation: module.numFormation, titre: `Formation #${module.numFormation}` },
          modules: [],
        });
      }
      groupes.get(key).modules.push(module);
    });

    // Si on cherche un module, on ne garde que les groupes qui ont des modules
    if (recherche.trim()) {
      return [...groupes.values()].filter((g) => g.modules.length > 0);
    }

    return [...groupes.values()];
  }, [formations, modulesFiltres, formationFiltre, recherche]);

  const obtenirNomFormation = (module) => {
    const formation = formations.find(
      (item) => String(item.numFormation) === String(module.numFormation)
    );
    return (
      module.formation?.titre ||
      formation?.titre ||
      `Formation #${module.numFormation}`
    );
  };

  const toggleFormation = (numFormation) => {
    setFormationsOuvertes((prev) => {
      const next = new Set(prev);
      const key = String(numFormation);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toutOuvrir = () => {
    setFormationsOuvertes(new Set(groupesParFormation.map((g) => String(g.formation.numFormation))));
  };

  const toutFermer = () => {
    setFormationsOuvertes(new Set());
  };

  const supprimerModule = async (codeModule) => {
    if (!codeModule) {
      setErreurSuppression("Identifiant du module introuvable.");
      return;
    }
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer ce module ? Cette action est irréversible."
    );
    if (!confirmation) return;
    try {
      setSuppression(codeModule);
      setErreurSuppression("");
      setSuccesSuppression("");
      const token = getToken();
      if (!token) {
        throw new Error("Session expirée. Veuillez vous reconnecter.");
      }
      const response = await fetch(
        `${API}/modules/${encodeURIComponent(codeModule)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await lireReponse(response);
      if (!response.ok) {
        throw new Error(result.message || "La suppression du module a échoué.");
      }
      setSuccesSuppression(result.message || "Module supprimé avec succès.");
      await mutate();
    } catch (err) {
      setErreurSuppression(err.message || "Impossible de supprimer ce module.");
    } finally {
      setSuppression(null);
    }
  };

  const totalFormations = new Set(modules.map((module) => module.numFormation)).size;

  // Une formation est ouverte si elle est dans le Set OU si on cherche / filtre (on ouvre tout)
  const estOuverte = (numFormation) => {
    if (recherche.trim() || formationFiltre) return true;
    // Par défaut : tout ouvert si jamais cliqué, sinon on suit le Set
    // Si le Set est vide au début, on considère tout ouvert
    if (formationsOuvertes.size === 0) return true;
    return formationsOuvertes.has(String(numFormation));
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>ESPACE FORMATEUR</span>
            <h1>Mes modules</h1>
            <p>Modules regroupés par formation. Ouvre une formation pour voir ses modules.</p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/dashboard/formateur" className={styles.backButton}>
              <ArrowLeft size={18} /> Tableau de bord
            </Link>
            <Link href="/dashboard/formateur/modules/creer" className={styles.addButton}>
              <Plus size={18} /> Ajouter un module
            </Link>
          </div>
        </header>

        <section className={styles.stats}>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><Layers size={22} /></div>
            <div><span>Total des modules</span><strong>{modules.length}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><BookOpen size={22} /></div>
            <div><span>Formations concernées</span><strong>{totalFormations}</strong></div>
          </article>
          <article className={styles.statCard}>
            <div className={styles.statIcon}><Search size={22} /></div>
            <div><span>Modules affichés</span><strong>{modulesFiltres.length}</strong></div>
          </article>
        </section>

        <section className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <h2>Modules par formation</h2>
              <p>Retrouvez tous les modules créés dans vos formations.</p>
            </div>
            <span className={styles.count}>{groupesParFormation.length} formation(s) • {modulesFiltres.length} module(s)</span>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input
                type="search"
                placeholder="Rechercher un module ou une formation..."
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
            <select value={formationFiltre} onChange={(e) => setFormationFiltre(e.target.value)}>
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.numFormation} value={formation.numFormation}>
                  {formation.titre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.groupActions}>
            <button type="button" onClick={toutOuvrir}>Tout ouvrir</button>
            <button type="button" onClick={toutFermer}>Tout fermer</button>
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
              Chargement des modules...
            </div>
          ) : error ? (
            <div className={styles.error}>
              <strong>Une erreur est survenue</strong>
              <p>{error.message}</p>
              <button type="button" onClick={() => mutate()}>Réessayer</button>
            </div>
          ) : (
            <>
              {groupesParFormation.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}><Layers size={36} /></div>
                  <h3>{modules.length === 0 ? "Aucun module pour le moment" : "Aucun module trouvé"}</h3>
                  <p>
                    {modules.length === 0
                      ? "Commencez par ajouter votre premier module à une formation."
                      : "Essayez de modifier votre recherche ou votre filtre."}
                  </p>
                  {modules.length === 0 && (
                    <Link href="/dashboard/formateur/modules/creer">Ajouter mon premier module</Link>
                  )}
                </div>
              ) : (
                <div className={styles.formationGroups}>
                  {groupesParFormation.map(({ formation, modules: modulesDuGroupe }) => {
                    const ouvert = estOuverte(formation.numFormation);
                    return (
                      <section key={formation.numFormation} className={styles.formationGroup}>
                        {/* EN-TÊTE FORMATION - cliquable pour ouvrir / fermer */}
                        <button
                          type="button"
                          className={styles.formationGroupHeader}
                          onClick={() => toggleFormation(formation.numFormation)}
                        >
                          <span className={styles.formationGroupIcon}><BookOpen size={22} /></span>
                          <span className={styles.formationGroupInfo}>
                            <strong>{formation.titre}</strong>
                            <small>
                              {formation.description || `Formation #${formation.numFormation}`}
                              {formation.dateDebut ? ` • Début : ${String(formation.dateDebut).slice(0, 10)}` : ""}
                            </small>
                          </span>
                          <span className={styles.formationGroupCount}>
                            {modulesDuGroupe.length} module(s)
                          </span>
                          <span className={styles.formationGroupChevron}>
                            {ouvert ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </span>
                        </button>

                        {/* MODULES DE CETTE FORMATION */}
                        {ouvert && (
                          <>
                            {modulesDuGroupe.length === 0 ? (
                              <div className={styles.noModule}>
                                Aucun module dans cette formation pour le moment.
                                <Link href="/dashboard/formateur/modules/creer">+ Ajouter un module</Link>
                              </div>
                            ) : (
                              <div className={styles.moduleGrid}>
                                {modulesDuGroupe.map((module) => (
                                  <article className={styles.moduleCard} key={module.codeModule}>
                                    <div className={styles.cardTop}>
                                      <span className={styles.lessonIcon}><Layers size={20} /></span>
                                      <span className={styles.orderBadge}>Module {module.ordre || 1}</span>
                                    </div>
                                    <h3>{module.titreModule}</h3>
                                    <p className={styles.description}>
                                      {module.descriptionModule || "Aucune description disponible."}
                                    </p>
                                    <div className={styles.formationInfo}>
                                      <span>FORMATION ASSOCIÉE</span>
                                      <strong>{obtenirNomFormation(module)}</strong>
                                    </div>
                                    <div className={styles.cardFooter}>
                                      <Link
                                        href={`/dashboard/formateur/modules/modifier?id=${encodeURIComponent(module.codeModule)}`}
                                        className={styles.editButton}
                                      >
                                        <Pencil size={16} /> Modifier
                                      </Link>
                                      <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() => supprimerModule(module.codeModule)}
                                        disabled={suppression !== null}
                                      >
                                        <Trash2 size={16} />
                                        {suppression === module.codeModule ? "Suppression..." : "Supprimer"}
                                      </button>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <footer className={styles.footer}>Learning Pro · Espace formateur</footer>
      </div>
    </main>
  );
}