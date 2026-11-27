
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./modifier.module.css";

import { obtenirApiFormateur } from "@/lib/api";
const API = obtenirApiFormateur();

function token() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

async function requete(url, options = {}) {
  const jwt = token();

  if (!jwt) {
    throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  const texte = await response.text().catch(() => "");
  let data = {};

  if (texte) {
    try {
      data = JSON.parse(texte);
    } catch {
      data = { message: texte };
    }
  }

  if (!response.ok) {
    throw new Error(data.message || data.erreur || "Une erreur est survenue.");
  }

  return data;
}

function extraireListe(data, cle) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[cle])) return data[cle];
  if (Array.isArray(data?.donnees)) return data.donnees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function extraireIdentifiant(data, champs) {
  const sources = [data, data?.question, data?.reponse, data?.donnees, data?.data];

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const champ of champs) {
      if (source[champ] !== undefined && source[champ] !== null) {
        return source[champ];
      }
    }
  }

  return null;
}

function nouvelleQuestion() {
  return {
    clientId: `new-${Date.now()}-${Math.random()}`,
    numQuestion: null,
    typeQuestion: "choix_multiple",
    enonce: "",
    points: 1,
    reponses: [
      { numReponse: null, libelle: "", esCorrect: false },
      { numReponse: null, libelle: "", esCorrect: false },
    ],
  };
}

function normaliserReponse(reponse) {
  const valeur = reponse.esCorrect ?? reponse.estCorrecte;

  return {
    numReponse: reponse.numReponse ?? reponse.idReponse ?? null,
    libelle: reponse.libelle || "",
    esCorrect:
      valeur === true ||
      valeur === 1 ||
      valeur === "1" ||
      valeur === "true",
  };
}

function normaliserQuestion(question) {
  const typeQuestion = question.typeQuestion || "choix_multiple";

  let reponses = (question.reponses || []).map(normaliserReponse);

  if (typeQuestion === "vrai_faux") {
    const vrai = reponses.find(
      (reponse) => reponse.libelle.trim().toLowerCase() === "vrai"
    );

    const faux = reponses.find(
      (reponse) => reponse.libelle.trim().toLowerCase() === "faux"
    );

    reponses = [
      vrai || {
        numReponse: null,
        libelle: "Vrai",
        esCorrect: false,
      },
      faux || {
        numReponse: null,
        libelle: "Faux",
        esCorrect: false,
      },
    ];

    if (reponses.filter((reponse) => reponse.esCorrect).length > 1) {
      reponses = reponses.map((reponse, index) => ({
        ...reponse,
        esCorrect: index === 0,
      }));
    }
  }

  return {
    clientId: `existing-${question.numQuestion}`,
    numQuestion: question.numQuestion,
    typeQuestion,
    enonce: question.enonce || "",
    points: question.points ?? 1,
    reponses,
  };
}

function Icon({ name, size = 20 }) {
  const icons = {
    back: (
      <g>
        <path d="m15 18-6-6 6-6" />
        <path d="M20 12H9" />
      </g>
    ),
    plus: (
      <g>
        <path d="M12 5v14M5 12h14" />
      </g>
    ),
    trash: (
      <g>
        <path d="M3 6h18M8 6V4h8v2" />
        <path d="m19 6-1 14H6L5 6" />
        <path d="M10 11v5M14 11v5" />
      </g>
    ),
    check: (
      <g>
        <path d="m5 12 4 4L19 6" />
      </g>
    ),
    alert: (
      <g>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </g>
    ),
    quiz: (
      <g>
        <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5H8Z" />
        <path d="M14 3v6h7M8 13h8M8 17h6" />
      </g>
    ),
    book: (
      <g>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </g>
    ),
    clock: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </g>
    ),
    target: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </g>
    ),
    info: (
      <g>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </g>
    ),
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
      {icons[name] || icons.quiz}
    </svg>
  );
}

function ModifierQuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [idQuiz, setIdQuiz] = useState("");
  const [formations, setFormations] = useState([]);
  const [quizInitial, setQuizInitial] = useState(null);

  const [numFormation, setNumFormation] = useState("");
  const [nomQuiz, setNomQuiz] = useState("");
  const [descriptionQuiz, setDescriptionQuiz] = useState("");
  const [duree, setDuree] = useState("30");
  const [seuilReussite, setSeuilReussite] = useState("50");

  const [questions, setQuestions] = useState([]);

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const formationSelectionnee = formations.find(
    (formation) =>
      String(formation.numFormation) === String(numFormation)
  );

  const nombreQuestions = questions.length;

  const nombreReponses = questions.reduce(
    (total, question) => total + question.reponses.length,
    0
  );

  const nombreBonnesReponses = questions.reduce(
    (total, question) =>
      total + question.reponses.filter((reponse) => reponse.esCorrect).length,
    0
  );

  useEffect(() => {
    const controller = new AbortController();
    let actif = true;

    async function chargerDonnees() {
      try {
        if (!token()) {
          router.replace("/connexion");
          return;
        }

        const id =
          searchParams.get("id") ||
          searchParams.get("codeQuiz");

        if (!id) {
          throw new Error("Identifiant du quiz manquant dans l'adresse.");
        }

        const [quizData, formationsData] = await Promise.all([
          requete(`/quiz/${encodeURIComponent(id)}`, {
            signal: controller.signal,
          }),
          requete("/formations", {
            signal: controller.signal,
          }),
        ]);

        if (!actif || controller.signal.aborted) return;

        const quiz = quizData.quiz || quizData;

        if (!quiz.codeQuiz) {
          throw new Error("Les informations du quiz sont introuvables.");
        }

        const listeFormations = extraireListe(
          formationsData,
          "formations"
        );

        setFormations(listeFormations);

        let formationId =
          quiz.numFormation ||
          quiz.formation?.numFormation ||
          quiz.Formation?.numFormation ||
          "";

        if (!formationId && quiz.codeModule) {
          const modulesData = await requete("/modules", {
            signal: controller.signal,
          });

          if (!actif || controller.signal.aborted) return;

          const modules = extraireListe(modulesData, "modules");

          const moduleAssocie = modules.find(
            (module) =>
              Number(module.codeModule) === Number(quiz.codeModule)
          );

          formationId =
            moduleAssocie?.numFormation ||
            moduleAssocie?.formation?.numFormation ||
            "";
        }

        setIdQuiz(String(quiz.codeQuiz));
        setQuizInitial(quiz);
        setNumFormation(formationId ? String(formationId) : "");

        setNomQuiz(quiz.nomQuiz || "");
        setDescriptionQuiz(quiz.descriptionQuiz || "");
        setDuree(String(quiz.duree || 30));
        setSeuilReussite(String(quiz.seuilReussite ?? 50));

        setQuestions((quiz.questions || []).map(normaliserQuestion));
      } catch (error) {
        if (actif && error?.name !== "AbortError") {
          setErreur(error.message);
        }
      } finally {
        if (actif && !controller.signal.aborted) {
          setChargement(false);
        }
      }
    }

    chargerDonnees();

    return () => {
      actif = false;
      controller.abort();
    };
  }, [router, searchParams]);

  function modifierQuestion(index, champ, valeur) {
    setQuestions((current) =>
      current.map((question, i) =>
        i === index ? { ...question, [champ]: valeur } : question
      )
    );
  }

  function modifierReponse(indexQuestion, indexReponse, champ, valeur) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== indexQuestion) return question;

        if (
          question.typeQuestion === "vrai_faux" &&
          champ === "esCorrect"
        ) {
          return {
            ...question,
            reponses: question.reponses.map((reponse, j) => ({
              ...reponse,
              esCorrect: j === indexReponse ? valeur : false,
            })),
          };
        }

        return {
          ...question,
          reponses: question.reponses.map((reponse, j) =>
            j === indexReponse
              ? { ...reponse, [champ]: valeur }
              : reponse
          ),
        };
      })
    );
  }

  function changerTypeQuestion(index, type) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== index || question.typeQuestion === type) return question;

        if (type === "vrai_faux") {
          const ancienneCorrecte = question.reponses.find(
            (reponse) => reponse.esCorrect
          );

          const choixCorrect = ancienneCorrecte
            ? ancienneCorrecte.libelle.trim().toLowerCase()
            : "";

          return {
            ...question,
            typeQuestion: "vrai_faux",
            reponses: [
              {
                numReponse: null,
                libelle: "Vrai",
                esCorrect: choixCorrect === "vrai",
              },
              {
                numReponse: null,
                libelle: "Faux",
                esCorrect: choixCorrect === "faux",
              },
            ],
          };
        }

        return {
          ...question,
          typeQuestion: "choix_multiple",
          reponses: [
            {
              numReponse: null,
              libelle: "",
              esCorrect: false,
            },
            {
              numReponse: null,
              libelle: "",
              esCorrect: false,
            },
          ],
        };
      })
    );

    setErreur("");
  }

  function ajouterQuestion() {
    setQuestions((current) => [...current, nouvelleQuestion()]);
    setErreur("");
  }

  function supprimerQuestion(index) {
    if (questions.length <= 1) {
      setErreur("Le quiz doit contenir au moins une question.");
      return;
    }

    setQuestions((current) => current.filter((_, i) => i !== index));
    setErreur("");
  }

  function ajouterReponse(indexQuestion) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== indexQuestion) return question;
        if (question.typeQuestion === "vrai_faux") return question;

        return {
          ...question,
          reponses: [
            ...question.reponses,
            {
              numReponse: null,
              libelle: "",
              esCorrect: false,
            },
          ],
        };
      })
    );
  }

  function supprimerReponse(indexQuestion, indexReponse) {
    setQuestions((current) =>
      current.map((question, i) => {
        if (i !== indexQuestion) return question;
        if (question.typeQuestion === "vrai_faux") return question;
        if (question.reponses.length <= 2) return question;

        return {
          ...question,
          reponses: question.reponses.filter(
            (_, j) => j !== indexReponse
          ),
        };
      })
    );
  }

  function validerFormulaire() {
    if (!numFormation) {
      return "Sélectionne une formation pour ce quiz.";
    }

    if (
      !formations.some(
        (formation) =>
          Number(formation.numFormation) === Number(numFormation)
      )
    ) {
      return "La formation sélectionnée est invalide.";
    }

    if (!nomQuiz.trim()) {
      return "Le nom du quiz est obligatoire.";
    }

    if (!Number.isInteger(Number(duree)) || Number(duree) <= 0) {
      return "La durée doit être un nombre entier supérieur à zéro.";
    }

    if (
      !Number.isFinite(Number(seuilReussite)) ||
      Number(seuilReussite) < 0 ||
      Number(seuilReussite) > 100
    ) {
      return "Le seuil de réussite doit être compris entre 0 et 100.";
    }

    if (questions.length === 0) {
      return "Le quiz doit contenir au moins une question.";
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (!question.enonce.trim()) {
        return `L'énoncé de la question ${i + 1} est obligatoire.`;
      }

      if (
        !Number.isInteger(Number(question.points)) ||
        Number(question.points) <= 0
      ) {
        return `Les points de la question ${i + 1} doivent être supérieurs à zéro.`;
      }

      if (question.typeQuestion === "vrai_faux") {
        if (question.reponses.length !== 2) {
          return `La question ${i + 1} de type Vrai/Faux doit contenir exactement deux réponses.`;
        }

        const labels = question.reponses.map((reponse) =>
          reponse.libelle.trim().toLowerCase()
        );

        if (labels[0] !== "vrai" || labels[1] !== "faux") {
          return `Les propositions de la question ${i + 1} doivent être Vrai et Faux.`;
        }

        if (
          question.reponses.filter((reponse) => reponse.esCorrect).length !== 1
        ) {
          return `La question Vrai/Faux ${i + 1} doit avoir une seule bonne réponse.`;
        }
      } else {
        if (question.reponses.length < 2) {
          return `La question ${i + 1} doit avoir au moins deux réponses.`;
        }

        if (question.reponses.some((reponse) => !reponse.libelle.trim())) {
          return `Toutes les réponses de la question ${i + 1} doivent être renseignées.`;
        }

        if (!question.reponses.some((reponse) => reponse.esCorrect)) {
          return `Sélectionne au moins une bonne réponse pour la question ${i + 1}.`;
        }
      }
    }

    return "";
  }

  async function enregistrerModifications(event) {
    event.preventDefault();

    if (enregistrement) return;

    setErreur("");
    setSucces("");

    const validation = validerFormulaire();

    if (validation) {
      setErreur(validation);
      return;
    }

    setEnregistrement(true);

    try {
      await requete(`/quiz/${encodeURIComponent(idQuiz)}`, {
        method: "PUT",
        body: JSON.stringify({
          nomQuiz: nomQuiz.trim(),
          descriptionQuiz: descriptionQuiz.trim(),
          duree: Number(duree),
          seuilReussite: Number(seuilReussite),
          typeQuiz: "final",
          codeModule: null,
          numFormation: Number(numFormation),
        }),
      });

      const anciennesQuestions = quizInitial.questions || [];

      const questionsActuellesIds = questions
        .filter((question) => question.numQuestion)
        .map((question) => Number(question.numQuestion));

      for (const ancienneQuestion of anciennesQuestions) {
        if (
          !questionsActuellesIds.includes(
            Number(ancienneQuestion.numQuestion)
          )
        ) {
          await requete(
            `/questions/${encodeURIComponent(ancienneQuestion.numQuestion)}`,
            {
              method: "DELETE",
            }
          );
        }
      }

      for (const question of questions) {
        let numQuestion = question.numQuestion;

        if (!numQuestion) {
          const resultat = await requete("/questions", {
            method: "POST",
            body: JSON.stringify({
              typeQuestion: question.typeQuestion,
              enonce: question.enonce.trim(),
              points: Number(question.points),
              codeQuiz: Number(idQuiz),
            }),
          });

          numQuestion = extraireIdentifiant(resultat, [
            "numQuestion",
            "idQuestion",
          ]);

          if (numQuestion === null) {
            throw new Error(
              "Impossible de récupérer l'identifiant de la nouvelle question."
            );
          }

          for (const reponse of question.reponses) {
            await requete(
              `/questions/${encodeURIComponent(numQuestion)}/reponses`,
              {
                method: "POST",
                body: JSON.stringify({
                  libelle: reponse.libelle.trim(),
                  esCorrect: Boolean(reponse.esCorrect),
                }),
              }
            );
          }

          continue;
        }

        await requete(`/questions/${encodeURIComponent(numQuestion)}`, {
          method: "PUT",
          body: JSON.stringify({
            typeQuestion: question.typeQuestion,
            enonce: question.enonce.trim(),
            points: Number(question.points),
          }),
        });

        const ancienneQuestion = anciennesQuestions.find(
          (item) =>
            Number(item.numQuestion) === Number(question.numQuestion)
        );

        const anciennesReponses = ancienneQuestion?.reponses || [];

        const reponsesActuellesIds = question.reponses
          .filter((reponse) => reponse.numReponse)
          .map((reponse) => Number(reponse.numReponse));

        for (const ancienneReponse of anciennesReponses) {
          if (
            !reponsesActuellesIds.includes(
              Number(ancienneReponse.numReponse)
            )
          ) {
            await requete(
              `/reponses/${encodeURIComponent(ancienneReponse.numReponse)}`,
              {
                method: "DELETE",
              }
            );
          }
        }

        for (const reponse of question.reponses) {
          if (reponse.numReponse) {
            await requete(
              `/reponses/${encodeURIComponent(reponse.numReponse)}`,
              {
                method: "PUT",
                body: JSON.stringify({
                  libelle: reponse.libelle.trim(),
                  esCorrect: Boolean(reponse.esCorrect),
                }),
              }
            );
          } else {
            await requete(
              `/questions/${encodeURIComponent(numQuestion)}/reponses`,
              {
                method: "POST",
                body: JSON.stringify({
                  libelle: reponse.libelle.trim(),
                  esCorrect: Boolean(reponse.esCorrect),
                }),
              }
            );
          }
        }
      }

      setSucces(
        "Le quiz final et ses questions ont été modifiés avec succès."
      );

      router.push("/dashboard/formateur/quiz");
      router.refresh();
    } catch (error) {
      setErreur(
        `${error.message} Certaines modifications précédentes ont peut-être déjà été enregistrées.`
      );
    } finally {
      setEnregistrement(false);
    }
  }

  if (chargement) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        Chargement du quiz...
      </div>
    );
  }

  if (!quizInitial) {
    return (
      <main className={styles.page}>
        <div className={styles.error}>
          {erreur || "Impossible de charger ce quiz."}
        </div>

        <Link
          href="/dashboard/formateur/quiz"
          className={styles.back}
        >
          <Icon name="back" size={18} />
          Retour aux quiz
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link
            href="/dashboard/formateur/quiz"
            className={styles.back}
          >
            <Icon name="back" size={18} />
            Retour
          </Link>

          <span className={styles.eyebrow}>
            ESPACE FORMATEUR
          </span>

          <h1>Modifier le quiz</h1>

          <p>
            Modifie la formation associée, les informations, les
            questions et les réponses de ton évaluation.
          </p>
        </div>

        <div className={styles.headerIcon}>
          <Icon name="quiz" size={32} />
        </div>
      </div>

      {erreur && (
        <div className={styles.error} role="alert">
          <Icon name="alert" size={19} />
          <span>{erreur}</span>

          <button
            type="button"
            onClick={() => setErreur("")}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {succes && (
        <div className={styles.success} role="status">
          <Icon name="check" size={19} />
          <span>{succes}</span>
        </div>
      )}

      <form onSubmit={enregistrerModifications}>
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionIcon}>01</div>

            <div>
              <h2>Informations du quiz</h2>
              <p>
                Modifie les paramètres généraux de ton évaluation.
              </p>
            </div>
          </div>

          <div className={styles.modeBanner}>
            <div>
              <span className={styles.modeLabel}>
                TYPE D&apos;ÉVALUATION
              </span>

              <strong>Quiz final de formation</strong>

              <p>
                Ce quiz est directement associé à une formation.
              </p>
            </div>

            <span className={styles.modeBadge}>FINAL</span>
          </div>

          <div className={styles.grid}>
            <label className={styles.field}>
              Formation *

              <select
                value={numFormation}
                onChange={(e) => setNumFormation(e.target.value)}
                required
                disabled={enregistrement}
              >
                <option value="">
                  Sélectionner une formation
                </option>

                {formations.map((formation) => (
                  <option
                    key={formation.numFormation}
                    value={formation.numFormation}
                  >
                    {formation.titre ||
                      formation.titreFormation ||
                      `Formation ${formation.numFormation}`}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Nom du quiz *

              <input
                value={nomQuiz}
                onChange={(e) => setNomQuiz(e.target.value)}
                maxLength={150}
                required
                disabled={enregistrement}
              />
            </label>

            <label className={styles.field}>
              Durée (minutes) *

              <input
                type="number"
                min="1"
                step="1"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                required
                disabled={enregistrement}
              />
            </label>

            <label className={styles.field}>
              Seuil de réussite (%) *

              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={seuilReussite}
                onChange={(e) => setSeuilReussite(e.target.value)}
                required
                disabled={enregistrement}
              />
            </label>
          </div>

          {formationSelectionnee && (
            <div className={styles.bottomInfo}>
              <Icon name="check" size={17} />
              Quiz associé à :{" "}
              {formationSelectionnee.titre ||
                formationSelectionnee.titreFormation ||
                `Formation ${formationSelectionnee.numFormation}`}
            </div>
          )}

          <label className={styles.field}>
            Description

            <textarea
              value={descriptionQuiz}
              onChange={(e) => setDescriptionQuiz(e.target.value)}
              maxLength={255}
              rows={3}
              disabled={enregistrement}
            />

            <span className={styles.counter}>
              {descriptionQuiz.length}/255 caractères
            </span>
          </label>
        </section>

        <div className={styles.questionHeader}>
          <div>
            <span className={styles.eyebrow}>
              CONTENU DE L&apos;ÉVALUATION
            </span>

            <h2>Questions et réponses</h2>

            <p>
              {nombreQuestions} question(s) · {nombreReponses} réponse(s) ·{" "}
              {nombreBonnesReponses} correcte(s)
            </p>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={ajouterQuestion}
            disabled={enregistrement}
          >
            <Icon name="plus" size={18} />
            Ajouter une question
          </button>
        </div>

        {questions.map((question, index) => (
          <section
            className={styles.questionCard}
            key={question.clientId}
          >
            <div className={styles.questionTitle}>
              <div className={styles.questionNumber}>
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className={styles.questionTitleText}>
                <h3>Question {index + 1}</h3>

                <span>
                  {question.typeQuestion === "vrai_faux"
                    ? "Question Vrai/Faux"
                    : "Question à choix multiples"}
                </span>
              </div>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => supprimerQuestion(index)}
                disabled={enregistrement || questions.length <= 1}
                title="Supprimer la question"
              >
                <Icon name="trash" size={17} />
              </button>
            </div>

            <div className={styles.grid}>
              <label className={styles.field}>
                Type de question

                <select
                  value={question.typeQuestion}
                  onChange={(e) =>
                    changerTypeQuestion(index, e.target.value)
                  }
                  disabled={enregistrement}
                >
                  <option value="choix_multiple">
                    Choix multiples
                  </option>

                  <option value="vrai_faux">
                    Vrai / Faux
                  </option>
                </select>
              </label>

              <label className={styles.field}>
                Points

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={question.points}
                  onChange={(e) =>
                    modifierQuestion(index, "points", e.target.value)
                  }
                  required
                  disabled={enregistrement}
                />
              </label>
            </div>

            <label className={styles.field}>
              Énoncé *

              <textarea
                value={question.enonce}
                onChange={(e) =>
                  modifierQuestion(index, "enonce", e.target.value)
                }
                maxLength={500}
                rows={3}
                required
                disabled={enregistrement}
              />

              <span className={styles.counter}>
                {question.enonce.length}/500 caractères
              </span>
            </label>

            <div className={styles.answersHeader}>
              <div>
                <h4>Propositions de réponses</h4>

                <p>
                  {question.typeQuestion === "vrai_faux"
                    ? "Sélectionne une seule réponse correcte."
                    : "Coche toutes les bonnes réponses. Plusieurs choix sont autorisés."}
                </p>
              </div>

              <span className={styles.answerCount}>
                {question.reponses.filter((reponse) => reponse.esCorrect).length}{" "}
                correcte(s)
              </span>
            </div>

            <div className={styles.answersList}>
              {question.reponses.map((reponse, j) => (
                <div
                  className={`${styles.answer} ${
                    reponse.esCorrect ? styles.correctAnswer : ""
                  }`}
                  key={
                    reponse.numReponse ||
                    `${question.clientId}-${j}`
                  }
                >
                  <label
                    className={styles.radioLabel}
                    title="Sélectionner comme bonne réponse"
                  >
                    {question.typeQuestion === "vrai_faux" ? (
                      <input
                        type="radio"
                        name={`correct-${question.clientId}`}
                        checked={Boolean(reponse.esCorrect)}
                        onChange={() =>
                          modifierReponse(
                            index,
                            j,
                            "esCorrect",
                            true
                          )
                        }
                        disabled={enregistrement}
                      />
                    ) : (
                      <input
                        type="checkbox"
                        checked={Boolean(reponse.esCorrect)}
                        onChange={(e) =>
                          modifierReponse(
                            index,
                            j,
                            "esCorrect",
                            e.target.checked
                          )
                        }
                        disabled={enregistrement}
                      />
                    )}

                    <span className={styles.radioCustom}>
                      {reponse.esCorrect && (
                        <Icon name="check" size={14} />
                      )}
                    </span>
                  </label>

                  <span className={styles.answerLetter}>
                    {question.typeQuestion === "vrai_faux"
                      ? j === 0
                        ? "V"
                        : "F"
                      : String.fromCharCode(65 + j)}
                  </span>

                  <input
                    className={styles.answerInput}
                    value={reponse.libelle}
                    onChange={(e) =>
                      modifierReponse(
                        index,
                        j,
                        "libelle",
                        e.target.value
                      )
                    }
                    maxLength={300}
                    placeholder={`Réponse ${j + 1}`}
                    required
                    disabled={
                      enregistrement ||
                      question.typeQuestion === "vrai_faux"
                    }
                  />

                  {reponse.esCorrect && (
                    <span className={styles.correctLabel}>
                      Bonne réponse
                    </span>
                  )}

                  {question.typeQuestion !== "vrai_faux" &&
                    question.reponses.length > 2 && (
                      <button
                        type="button"
                        className={styles.removeAnswer}
                        onClick={() => supprimerReponse(index, j)}
                        disabled={enregistrement}
                        title="Supprimer cette réponse"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                </div>
              ))}
            </div>

            {question.typeQuestion !== "vrai_faux" && (
              <button
                type="button"
                className={styles.addAnswer}
                onClick={() => ajouterReponse(index)}
                disabled={enregistrement}
              >
                <Icon name="plus" size={17} />
                Ajouter une réponse
              </button>
            )}
          </section>
        ))}

        <div className={styles.bottomInfo}>
          <Icon name="info" size={17} />
          <span>
            Les modifications seront enregistrées dans la base de données.
          </span>
        </div>

        <div className={styles.actions}>
          <Link
            href="/dashboard/formateur/quiz"
            className={styles.cancelButton}
          >
            Annuler
          </Link>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={enregistrement}
          >
            {enregistrement ? (
              <span className={styles.loadingContent}>
                <span className={styles.spinner} />
                Enregistrement...
              </span>
            ) : (
              <span className={styles.loadingContent}>
                <Icon name="check" size={19} />
                Enregistrer les modifications
              </span>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ModifierQuizPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          Chargement du quiz...
        </div>
      }
    >
      <ModifierQuizContent />
    </Suspense>
  );
}
