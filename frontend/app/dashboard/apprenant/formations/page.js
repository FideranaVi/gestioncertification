
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./formations.module.css";

import { obtenirApiApprenant } from "@/lib/api";
const API = obtenirApiApprenant();

function Icon({ name, size = 18 }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    play: <><path d="m8 5 12 7-12 7V5Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" /></>,
    arrow: <><path d="M5 12h14M12 5l7 7-7 7" /></>,
    back: <><path d="m12 19-7-7 7-7M5 12h14" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    award: <><circle cx="12" cy="8" r="6" /><path d="m8.2 13-1.2 9 5-3 5 3-1.2-9" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" /></>,
    graduation: <><path d="m2 10 10-5 10 5-10 5-10-5Z" /><path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" /></>,
    checkCircle: <><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>,
    alert: <><path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>
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
      {paths[name] || paths.book}
    </svg>
  );
}

function obtenirToken() {
  if (typeof window === "undefined") return "";

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  );
}

async function requete(url, options = {}) {
  const token = obtenirToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  if (
    typeof FormData === "undefined" ||
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  const texte = await response.text();
  let data = {};

  try {
    data = texte ? JSON.parse(texte) : {};
  } catch {
    data = { message: texte };
  }

  if (!response.ok) {
    throw new Error(
      data.message || data.erreur || "Une erreur est survenue."
    );
  }

  return data;
}

function liste(data, cle) {
  if (Array.isArray(data)) return data;
  if (cle && Array.isArray(data?.[cle])) return data[cle];
  if (Array.isArray(data?.formations)) return data.formations;
  if (Array.isArray(data?.modules)) return data.modules;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function obtenirUrl(url) {
  if (!url) return "";

  const valeur = String(url).trim();

  if (
    valeur.startsWith("http://") ||
    valeur.startsWith("https://") ||
    valeur.startsWith("blob:")
  ) {
    return valeur;
  }

  return `${SERVEUR}/${valeur.replace(/^\/+/, "")}`;
}

function obtenirContenu(module) {
  let contenu =
    module?.contenu ??
    module?.urlContenu ??
    module?.cheminFichier ??
    module?.fichier ??
    module?.mediaUrl ??
    "";

  if (typeof contenu === "object" && contenu !== null) {
    contenu =
      contenu.url ??
      contenu.src ??
      contenu.path ??
      contenu.chemin ??
      contenu.fichier ??
      "";
  }

  if (typeof contenu === "string") {
    try {
      const parsed = JSON.parse(contenu);

      if (typeof parsed === "string") {
        contenu = parsed;
      } else if (parsed && typeof parsed === "object") {
        contenu =
          parsed.url ??
          parsed.src ??
          parsed.path ??
          parsed.chemin ??
          parsed.fichier ??
          contenu;
      }
    } catch {
      contenu = contenu;
    }
  }

  return obtenirUrl(contenu);
}

function obtenirType(module, url) {
  const type = String(module?.typeContenu || "").toLowerCase();

  if (type.includes("pdf")) return "pdf";
  if (type.includes("video") || type.includes("vidéo")) return "video";
  if (type.includes("lien") || type.includes("link") || type.includes("url")) {
    return "lien";
  }

  const chemin = String(url || "").split("?")[0].toLowerCase();

  if (chemin.endsWith(".pdf")) return "pdf";

  if (
    [".mp4", ".webm", ".ogg", ".mov", ".m4v"].some(ext =>
      chemin.endsWith(ext)
    )
  ) {
    return "video";
  }

  if (
    url?.includes("youtube.com") ||
    url?.includes("youtu.be") ||
    url?.includes("vimeo.com")
  ) {
    return "video";
  }

  return "lien";
}

function obtenirYoutubeEmbed(url) {
  try {
    const parsed = new URL(url);
    let id = "";

    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.split("/").filter(Boolean)[0];
    } else if (parsed.hostname.includes("youtube.com")) {
      id =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop();
    }

    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
}

function obtenirVimeoEmbed(url) {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : "";
}

function obtenirDriveEmbed(url) {
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return match
    ? `https://drive.google.com/file/d/${match[1]}/preview`
    : "";
}

function obtenirNomFormation(formation) {
  return formation?.titre || formation?.nomFormation || "Formation";
}

function estTermine(module) {
  return (
    module?.termine === true ||
    module?.statut === "terminee" ||
    module?.suiviModule?.statut === "terminee"
  );
}

function obtenirStatut(module) {
  if (estTermine(module)) return "terminee";

  if (
    module?.statut === "en_cours" ||
    module?.suiviModule?.statut === "en_cours"
  ) {
    return "en_cours";
  }

  return "non_commence";
}

function obtenirQuizFinal(formation) {
  const quiz = formation?.quizFinal;

  if (!quiz || typeof quiz !== "object") return null;

  return quiz.codeQuiz ? quiz : null;
}

function ModuleContenu({ module }) {
  const url = obtenirContenu(module);
  const type = obtenirType(module, url);

  if (!url) {
    return (
      <div className={styles.contentEmpty}>
        <span className={styles.emptyIcon}>
          <Icon name="file" size={28} />
        </span>
        <h3>Contenu indisponible</h3>
        <p>
          Ce module ne contient pas encore de document ou de ressource.
        </p>
      </div>
    );
  }

  const youtube = obtenirYoutubeEmbed(url);
  const vimeo = obtenirVimeoEmbed(url);
  const drive = obtenirDriveEmbed(url);

  if (type === "video") {
    if (youtube || vimeo || drive) {
      return (
        <section className={styles.contentCard}>
          <div className={styles.contentHeading}>
            <span className={styles.contentIcon}>
              <Icon name="video" />
            </span>
            <div>
              <h2>Vidéo du module</h2>
              <p>Regardez attentivement cette ressource pédagogique.</p>
            </div>
          </div>

          <div className={styles.mediaContainer}>
            <iframe
              src={youtube || vimeo || drive}
              title={module.titreModule || "Vidéo du module"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
      );
    }

    return (
      <section className={styles.contentCard}>
        <div className={styles.contentHeading}>
          <span className={styles.contentIcon}>
            <Icon name="video" />
          </span>
          <div>
            <h2>Vidéo du module</h2>
            <p>Regardez la vidéo pour apprendre le contenu du module.</p>
          </div>
        </div>

        <video controls preload="metadata" className={styles.videoPlayer}>
          <source src={url} />
          Votre navigateur ne prend pas en charge la lecture vidéo.
        </video>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.resourceLink}
        >
          Ouvrir la vidéo dans un nouvel onglet
          <Icon name="arrow" size={16} />
        </a>
      </section>
    );
  }

  if (type === "pdf") {
    return (
      <section className={styles.contentCard}>
        <div className={styles.contentHeading}>
          <span className={styles.contentIcon}>
            <Icon name="file" />
          </span>
          <div>
            <h2>Document PDF</h2>
            <p>Consultez le support pédagogique de ce module.</p>
          </div>
        </div>

        <div className={styles.pdfContainer}>
          <iframe
            src={url}
            title={module.titreModule || "Document PDF"}
          />
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.resourceLink}
        >
          Ouvrir ou télécharger le PDF
          <Icon name="arrow" size={16} />
        </a>
      </section>
    );
  }

  return (
    <section className={styles.contentCard}>
      <div className={styles.contentHeading}>
        <span className={styles.contentIcon}>
          <Icon name="link" />
        </span>
        <div>
          <h2>Ressource externe</h2>
          <p>Consultez cette ressource pour apprendre le contenu du module.</p>
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.resourceLink}
      >
        Consulter la ressource
        <Icon name="arrow" size={16} />
      </a>
    </section>
  );
}

function ModuleDetail({ moduleId }) {
  const router = useRouter();

  const [module, setModule] = useState(null);
  const [formation, setFormation] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [terminaison, setTerminaison] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let annule = false;

    async function chargerModule() {
      try {
        const [modulesData, formationsData] = await Promise.all([
          requete("/modules"),
          requete("/formations")
        ]);

        if (annule) return;

        const modules = liste(modulesData, "modules");
        const formations = liste(formationsData, "formations");

        const resultat = modules.find(item =>
          String(item.codeModule ?? item.idModule ?? item.id) ===
          String(moduleId)
        );

        if (!resultat) {
          throw new Error("Module introuvable ou non accessible.");
        }

        const formationAssociee = formations.find(item =>
          String(item.numFormation) === String(resultat.numFormation)
        );

        let moduleCharge = resultat;

        if (!estTermine(resultat)) {
          const debut = await requete(
            `/modules/${encodeURIComponent(moduleId)}/commencer`,
            { method: "POST" }
          );

          moduleCharge = {
            ...resultat,
            ...(debut.module || {}),
            suiviModule: debut.suiviModule || resultat.suiviModule,
            statut: debut.suiviModule?.statut || "en_cours"
          };
        }

        if (annule) return;

        setModule(moduleCharge);
        setFormation(formationAssociee || resultat.formation || null);
      } catch (error) {
        if (!annule) setErreur(error.message);
      } finally {
        if (!annule) setChargement(false);
      }
    }

    chargerModule();

    return () => {
      annule = true;
    };
  }, [moduleId]);

  const terminerModule = async () => {
    if (!module || terminaison || estTermine(module)) return;

    setErreur("");
    setMessage("");
    setTerminaison(true);

    try {
      const resultat = await requete(
        `/modules/${encodeURIComponent(moduleId)}/terminer`,
        { method: "PUT" }
      );

      setModule(current => ({
        ...current,
        statut: "terminee",
        termine: true,
        suiviModule: resultat.suiviModule || {
          ...(current.suiviModule || {}),
          statut: "terminee"
        }
      }));

      setMessage(
        resultat.message ||
        "Module terminé avec succès. Votre progression a été mise à jour."
      );

      if (resultat.tousModulesTermines) {
        setMessage(
          "Félicitations ! Tous les modules de cette formation sont terminés. Le quiz final est maintenant déverrouillé."
        );
      }
    } catch (error) {
      setErreur(error.message);
    } finally {
      setTerminaison(false);
    }
  };

  if (chargement) {
    return (
      <main className={styles.container}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <p>Chargement du module...</p>
        </div>
      </main>
    );
  }

  if (erreur && !module) {
    return (
      <main className={styles.container}>
        <div className={styles.messageError}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push("/dashboard/apprenant/formations")}
        >
          <Icon name="back" />
          Retour aux formations
        </button>
      </main>
    );
  }

  if (!module) return null;

  const url = obtenirContenu(module);
  const type = obtenirType(module, url);
  const termine = estTermine(module);

  return (
    <main className={styles.container}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => router.push("/dashboard/apprenant/formations")}
      >
        <Icon name="back" size={17} />
        Retour aux formations
      </button>

      <header className={styles.moduleHeader}>
        <span className={styles.eyebrow}>MODULE DE FORMATION</span>

        <div className={styles.moduleTitleRow}>
          <div>
            <h1>{module.titreModule || "Module sans titre"}</h1>
            <p>
              {module.descriptionModule || "Aucune description disponible."}
            </p>
          </div>

          <span
            className={`${styles.statusBadge} ${
              termine ? styles.statusDone : styles.statusProgress
            }`}
          >
            <Icon name={termine ? "checkCircle" : "clock"} size={15} />
            {termine ? "Terminé" : "En cours"}
          </span>
        </div>

        {formation && (
          <p className={styles.formationReference}>
            <Icon name="book" size={16} />
            Formation : <strong>{obtenirNomFormation(formation)}</strong>
          </p>
        )}

        <span className={styles.contentType}>
          <Icon
            name={type === "video" ? "video" : type === "pdf" ? "file" : "link"}
            size={15}
          />
          {type === "video"
            ? "Vidéo"
            : type === "pdf"
              ? "Document PDF"
              : "Lien externe"}
        </span>
      </header>

      {erreur && (
        <div className={styles.messageError} role="alert">
          <Icon name="alert" />
          {erreur}
        </div>
      )}

      {message && (
        <div className={styles.messageSuccess} role="status">
          <Icon name="checkCircle" />
          {message}
        </div>
      )}

      <ModuleContenu module={module} />

      <section className={styles.completionPanel}>
        <div>
          <h2>{termine ? "Module validé" : "Vous avez terminé ce module ?"}</h2>
          <p>
            {termine
              ? "Votre progression a été enregistrée."
              : "Cliquez sur le bouton lorsque vous avez consulté le contenu pédagogique."}
          </p>
        </div>

        <button
          type="button"
          className={termine ? styles.completedButton : styles.primaryButton}
          onClick={terminerModule}
          disabled={termine || terminaison}
        >
          {termine ? (
            <>
              <Icon name="checkCircle" />
              Module terminé
            </>
          ) : terminaison ? (
            "Enregistrement..."
          ) : (
            <>
              <Icon name="check" />
              Terminer le module
            </>
          )}
        </button>
      </section>

      <footer className={styles.footer}>
        <Link href="/dashboard/apprenant/formations">
          <Icon name="back" size={16} />
          Retour à mes formations
        </Link>
      </footer>
    </main>
  );
}

function fusionnerFormations(disponibles, inscrites) {
  const map = new Map();

  disponibles.forEach(formation => {
    map.set(String(formation.numFormation), {
      ...formation,
      inscrit: false
    });
  });

  inscrites.forEach(formation => {
    const id = String(formation.numFormation);

    map.set(id, {
      ...(map.get(id) || {}),
      ...formation,
      inscrit: true
    });
  });

  return Array.from(map.values());
}

function CatalogueFormations() {
  const router = useRouter();

  const [formations, setFormations] = useState([]);
  const [modules, setModules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [actionEnCours, setActionEnCours] = useState(null);
  const [formationActive, setFormationActive] = useState(null);

  const chargerCatalogue = useCallback(async () => {
    const [disponibles, inscrites, modulesData] = await Promise.all([
      requete("/formations-disponibles"),
      requete("/formations"),
      requete("/modules")
    ]);

    setFormations(
      fusionnerFormations(
        liste(disponibles, "formations"),
        liste(inscrites, "formations")
      )
    );

    setModules(liste(modulesData, "modules"));
  }, []);

  useEffect(() => {
    let annule = false;

    async function initialiser() {
      try {
        const [disponibles, inscrites, modulesData] = await Promise.all([
          requete("/formations-disponibles"),
          requete("/formations"),
          requete("/modules")
        ]);

        if (annule) return;

        setFormations(
          fusionnerFormations(
            liste(disponibles, "formations"),
            liste(inscrites, "formations")
          )
        );

        setModules(liste(modulesData, "modules"));
      } catch (error) {
        if (!annule) setErreur(error.message);
      } finally {
        if (!annule) setChargement(false);
      }
    }

    initialiser();

    return () => {
      annule = true;
    };
  }, []);

  const inscription = async formation => {
    const id = formation.numFormation;

    if (!id) {
      setErreur("Identifiant de formation introuvable.");
      return;
    }

    setErreur("");
    setActionEnCours(String(id));

    try {
      await requete(
        `/formations/${encodeURIComponent(id)}/inscription`,
        { method: "POST" }
      );

      await chargerCatalogue();
    } catch (error) {
      setErreur(error.message);
    } finally {
      setActionEnCours(null);
    }
  };

  const desinscription = async formation => {
    const id = formation.numFormation;

    if (!id) {
      setErreur("Identifiant de formation introuvable.");
      return;
    }

    if (
      !window.confirm(
        "Voulez-vous vraiment vous désinscrire de cette formation ?"
      )
    ) {
      return;
    }

    setErreur("");
    setActionEnCours(String(id));

    try {
      await requete(
        `/formations/${encodeURIComponent(id)}/desinscription`,
        { method: "DELETE" }
      );

      await chargerCatalogue();
      setFormationActive(null);
    } catch (error) {
      setErreur(error.message);
    } finally {
      setActionEnCours(null);
    }
  };

  const modulesFormation = formation => {
    const depuisFormation = Array.isArray(formation.modules)
      ? formation.modules
      : [];

    const depuisApi = modules.filter(
      module =>
        String(module.numFormation) === String(formation.numFormation)
    );

    const map = new Map();

    [...depuisFormation, ...depuisApi].forEach(module => {
      const id = module.codeModule ?? module.idModule ?? module.id;
      if (id !== undefined && id !== null) {
        map.set(String(id), {
          ...(map.get(String(id)) || {}),
          ...module
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => (Number(a.ordre) || 0) - (Number(b.ordre) || 0)
    );
  };

  const formationsFiltrees = formations.filter(formation => {
    const titre = String(
      formation.titre ?? formation.nomFormation ?? ""
    ).toLowerCase();

    const description = String(formation.description ?? "").toLowerCase();
    const terme = recherche.toLowerCase();

    const correspondRecherche =
      titre.includes(terme) || description.includes(terme);

    const correspondFiltre =
      filtre === "toutes" ||
      (filtre === "inscrites" && formation.inscrit) ||
      (filtre === "disponibles" && !formation.inscrit);

    return correspondRecherche && correspondFiltre;
  });

  if (chargement) {
    return (
      <main className={styles.container}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          <p>Chargement des formations...</p>
        </div>
      </main>
    );
  }

  const nombreInscrites = formations.filter(item => item.inscrit).length;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <Icon name="graduation" size={25} />
        </div>

        <div>
          <span className={styles.eyebrow}>ESPACE APPRENANT</span>
          <h1>Mes formations</h1>
          <p>
            Découvrez les formations, suivez vos modules et mesurez votre
            progression jusqu&apos;à la certification.
          </p>
        </div>
      </header>

      {erreur && (
        <div className={styles.messageError} role="alert">
          <Icon name="alert" />
          <span>{erreur}</span>
          <button
            type="button"
            onClick={() => setErreur("")}
            aria-label="Fermer le message"
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      )}

      <section className={styles.overview}>
        <article className={styles.overviewCard}>
          <span className={styles.overviewIcon}>
            <Icon name="book" size={21} />
          </span>
          <div>
            <strong>{formations.length}</strong>
            <span>Formations disponibles</span>
          </div>
        </article>

        <article className={styles.overviewCard}>
          <span className={styles.overviewIcon}>
            <Icon name="graduation" size={21} />
          </span>
          <div>
            <strong>{nombreInscrites}</strong>
            <span>Mes inscriptions</span>
          </div>
        </article>

        <article className={styles.overviewCard}>
          <span className={styles.overviewIcon}>
            <Icon name="layers" size={21} />
          </span>
          <div>
            <strong>
              {formations
                .filter(item => item.inscrit)
                .reduce(
                  (total, item) =>
                    total + Number(item.modulesTermines || 0),
                  0
                )}
            </strong>
            <span>Modules terminés</span>
          </div>
        </article>
      </section>

      <section className={styles.searchPanel}>
        <div className={styles.searchBox}>
          <Icon name="search" size={19} />
          <input
            type="search"
            value={recherche}
            onChange={event => setRecherche(event.target.value)}
            placeholder="Rechercher une formation..."
            aria-label="Rechercher une formation"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              aria-label="Effacer la recherche"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <button
            type="button"
            className={filtre === "toutes" ? styles.activeFilter : ""}
            onClick={() => setFiltre("toutes")}
          >
            Toutes
          </button>
          <button
            type="button"
            className={filtre === "inscrites" ? styles.activeFilter : ""}
            onClick={() => setFiltre("inscrites")}
          >
            Mes formations
          </button>
          <button
            type="button"
            className={filtre === "disponibles" ? styles.activeFilter : ""}
            onClick={() => setFiltre("disponibles")}
          >
            Disponibles
          </button>
        </div>
      </section>

      {formationsFiltrees.length === 0 ? (
        <section className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <Icon name="search" size={27} />
          </span>
          <h2>Aucune formation trouvée</h2>
          <p>Essayez de modifier votre recherche ou votre filtre.</p>
        </section>
      ) : (
        <div className={styles.grid}>
          {formationsFiltrees.map((formation, index) => {
            const id = formation.numFormation;
            const listeModules = modulesFormation(formation);
            const ouverte = String(formationActive) === String(id);

            const modulesTermines = Number(
              formation.modulesTermines ??
              listeModules.filter(estTermine).length
            );

            const totalModules = Number(
              formation.totalModules ?? listeModules.length
            );

            const progression = Math.max(
              0,
              Math.min(
                100,
                Number(
                  formation.progression ??
                  (totalModules > 0
                    ? (modulesTermines / totalModules) * 100
                    : 0)
                )
              )
            );

            const tousModulesTermines =
              formation.tousModulesTermines === true ||
              (totalModules > 0 && modulesTermines >= totalModules);

            const quizFinal = obtenirQuizFinal(formation);
            const quizFinalAccessible =
              formation.inscrit && tousModulesTermines && Boolean(quizFinal);

            return (
              <article className={styles.formationCard} key={id ?? index}>
                <div className={styles.formationCardHeader}>
                  <span className={styles.formationIcon}>
                    <Icon name="book" size={23} />
                  </span>

                  <span
                    className={`${styles.enrollmentBadge} ${
                      formation.inscrit
                        ? styles.enrolled
                        : styles.available
                    }`}
                  >
                    {formation.inscrit ? "Inscrit" : "Disponible"}
                  </span>
                </div>

                <h2>{obtenirNomFormation(formation)}</h2>

                <p className={styles.formationDescription}>
                  {formation.description || "Aucune description disponible."}
                </p>

                <div className={styles.formationDates}>
                  {formation.dateDebut && (
                    <span>
                      <Icon name="calendar" size={15} />
                      Début : {String(formation.dateDebut).slice(0, 10)}
                    </span>
                  )}
                  {formation.dateFin && (
                    <span>
                      <Icon name="calendar" size={15} />
                      Fin : {String(formation.dateFin).slice(0, 10)}
                    </span>
                  )}
                </div>

                <div className={styles.moduleCount}>
                  <Icon name="layers" size={16} />
                  {listeModules.length} module(s)
                </div>

                {formation.inscrit && (
                  <div className={styles.progressSection}>
                    <div className={styles.progressLabels}>
                      <span>Progression de la formation</span>
                      <strong>{Math.round(progression)}%</strong>
                    </div>

                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-valuenow={Math.round(progression)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progression de la formation"
                    >
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progression}%` }}
                      />
                    </div>

                    <span className={styles.progressCaption}>
                      {modulesTermines} module(s) terminé(s) sur {totalModules}
                    </span>
                  </div>
                )}

                {formation.inscrit ? (
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => setFormationActive(ouverte ? null : id)}
                    >
                      <Icon name={ouverte ? "close" : "layers"} size={17} />
                      {ouverte ? "Masquer les modules" : "Consulter les modules"}
                    </button>

                    <button
                      type="button"
                      className={styles.textButton}
                      disabled={actionEnCours === String(id)}
                      onClick={() => desinscription(formation)}
                    >
                      {actionEnCours === String(id)
                        ? "En cours..."
                        : "Se désinscrire"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={actionEnCours === String(id)}
                    onClick={() => inscription(formation)}
                  >
                    <Icon name="graduation" size={17} />
                    {actionEnCours === String(id)
                      ? "Inscription..."
                      : "S'inscrire à la formation"}
                  </button>
                )}

                {formation.inscrit && ouverte && (
                  <div className={styles.modulesPanel}>
                    <div className={styles.panelHeading}>
                      <div>
                        <span className={styles.eyebrow}>PROGRAMME</span>
                        <h3>Modules de la formation</h3>
                      </div>
                      <span className={styles.moduleTotal}>
                        {listeModules.length} module(s)
                      </span>
                    </div>

                    {listeModules.length === 0 ? (
                      <div className={styles.emptyModules}>
                        Aucun module n&apos;a encore été ajouté à cette formation.
                      </div>
                    ) : (
                      <div className={styles.moduleList}>
                        {listeModules.map((module, moduleIndex) => {
                          const moduleId =
                            module.codeModule ??
                            module.idModule ??
                            module.id;

                          const type = obtenirType(
                            module,
                            obtenirContenu(module)
                          );

                          const statut = obtenirStatut(module);

                          return (
                            <article
                              key={moduleId ?? moduleIndex}
                              className={styles.moduleItem}
                            >
                              <div className={styles.moduleNumber}>
                                {String(module.ordre || moduleIndex + 1).padStart(2, "0")}
                              </div>

                              <div className={styles.moduleInfo}>
                                <h4>
                                  {module.titreModule || "Module sans titre"}
                                </h4>

                                <p>
                                  {module.descriptionModule ||
                                    "Aucune description disponible."}
                                </p>

                                <div className={styles.moduleMeta}>
                                  <span>
                                    <Icon
                                      name={
                                        type === "video"
                                          ? "video"
                                          : type === "pdf"
                                            ? "file"
                                            : "link"
                                      }
                                      size={14}
                                    />
                                    {type === "video"
                                      ? "Vidéo"
                                      : type === "pdf"
                                        ? "PDF"
                                        : "Lien externe"}
                                  </span>

                                  <span
                                    className={`${styles.statusBadge} ${
                                      statut === "terminee"
                                        ? styles.statusDone
                                        : statut === "en_cours"
                                          ? styles.statusProgress
                                          : styles.statusPending
                                    }`}
                                  >
                                    {statut === "terminee" ? (
                                      <Icon name="checkCircle" size={13} />
                                    ) : statut === "en_cours" ? (
                                      <Icon name="clock" size={13} />
                                    ) : (
                                      <Icon name="lock" size={13} />
                                    )}

                                    {statut === "terminee"
                                      ? "Terminé"
                                      : statut === "en_cours"
                                        ? "En cours"
                                        : "Non commencé"}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                className={styles.moduleOpenButton}
                                onClick={() =>
                                  router.push(
                                    `/dashboard/apprenant/formations?id=${encodeURIComponent(
                                      moduleId
                                    )}`
                                  )
                                }
                                aria-label={`Ouvrir le module ${module.titreModule || ""}`}
                              >
                                <Icon name="chevron" size={19} />
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}

                    <section className={styles.finalQuizPanel}>
                      <div className={styles.finalQuizIcon}>
                        <Icon name="award" size={23} />
                      </div>

                      <div className={styles.finalQuizInfo}>
                        <span className={styles.eyebrow}>ÉVALUATION FINALE</span>
                        <h3>{quizFinal?.nomQuiz || "Quiz final de la formation"}</h3>

                        {quizFinalAccessible ? (
                          <p>
                            Tous les modules sont terminés. Vous pouvez maintenant
                            passer le quiz final.
                          </p>
                        ) : !tousModulesTermines ? (
                          <p>
                            Terminez tous les modules pour déverrouiller cette
                            évaluation.
                          </p>
                        ) : (
                          <p>
                            Le quiz final n&apos;a pas encore été créé pour cette
                            formation.
                          </p>
                        )}
                      </div>

                      {quizFinalAccessible ? (
                        <button
                          type="button"
                          className={styles.finalQuizButton}
                          onClick={() =>
                            router.push(
                              `/dashboard/apprenant/quiz?codeQuiz=${encodeURIComponent(
                                quizFinal.codeQuiz
                              )}`
                            )
                          }
                        >
                          Passer le quiz
                          <Icon name="arrow" size={16} />
                        </button>
                      ) : (
                        <span className={styles.lockedLabel}>
                          <Icon name="lock" size={15} />
                          Verrouillé
                        </span>
                      )}
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <footer className={styles.footer}>
        <Link href="/dashboard/apprenant">
          <Icon name="back" size={16} />
          Retour au tableau de bord
        </Link>
      </footer>
    </main>
  );
}

function PageFormations() {
  const searchParams = useSearchParams();

  const moduleId =
    searchParams.get("id") ||
    searchParams.get("codeModule") ||
    searchParams.get("module");

  if (moduleId) {
    return <ModuleDetail moduleId={moduleId} />;
  }

  return <CatalogueFormations />;
}

export default function FormationsPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            <p>Chargement...</p>
          </div>
        </main>
      }
    >
      <PageFormations />
    </Suspense>
  );
}
