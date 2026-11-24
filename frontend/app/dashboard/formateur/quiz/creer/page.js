
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./creer.module.css";

const API = "http://localhost:5000/api/formateur";

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function requete(url, options = {}) {
  const token = obtenirToken();

  if (!token) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
    throw new Error(
      data.message || data.erreur || `Erreur HTTP ${response.status}`
    );
  }

  return data;
}

function extraireListe(data, noms = []) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  for (const nom of noms) {
    if (Array.isArray(data[nom])) return data[nom];
  }

  if (Array.isArray(data.donnees)) return data.donnees;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

function nouvelleQuestion(clientId = "question-initiale") {
  return {
    clientId,
    typeQuestion: "choix_multiple",
    enonce: "",
    points: 1,
    reponses: [
      { clientId: `${clientId}-r1`, libelle: "", esCorrect: false },
      { clientId: `${clientId}-r2`, libelle: "", esCorrect: false },
    ],
  };
}

function nouvelleQuestionVraiFaux(clientId) {
  return {
    clientId,
    typeQuestion: "vrai_faux",
    enonce: "",
    points: 1,
    reponses: [
      {
        clientId: `${clientId}-vrai`,
        libelle: "Vrai",
        esCorrect: false,
      },
      {
        clientId: `${clientId}-faux`,
        libelle: "Faux",
        esCorrect: false,
      },
    ],
  };
}

function extraireIdentifiant(data, champs) {
  const sources = [data, data?.quiz, data?.question, data?.donnees, data?.data];

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

export default function CreerQuizPage() {
  const router = useRouter();
  const compteur = useRef(1);

  const [formations, setFormations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);

  const [nomQuiz, setNomQuiz] = useState("");
  const [descriptionQuiz, setDescriptionQuiz] = useState("");
  const [duree, setDuree] = useState("30");
  const [seuilReussite, setSeuilReussite] = useState("50");
  const [numFormation, setNumFormation] = useState("");

  const [questions, setQuestions] = useState([
    nouvelleQuestion("question-1"),
  ]);

  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    let ignore = false;

    async function chargerFormations() {
      await Promise.resolve();

      if (signal.aborted || ignore) return;

      if (!obtenirToken()) {
        if (!ignore) setChargement(false);
        router.replace("/connexion");
        return;
      }

      try {
        const data = await requete("/formations", { signal });

        if (signal.aborted || ignore) return;

        const liste = extraireListe(data, ["formations", "formation"]);
        setFormations(liste);
        setErreur("");
      } catch (error) {
        if (error?.name === "AbortError" || signal.aborted || ignore) return;
        setErreur(error.message || "Impossible de charger les formations.");
      } finally {
        if (!signal.aborted && !ignore) setChargement(false);
      }
    }

    chargerFormations();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [router]);

  const formationSelectionnee = formations.find(
    (formation) => String(formation.numFormation) === String(numFormation)
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

  function ajouterQuestion() {
    compteur.current += 1;

    const clientId = `question-${compteur.current}`;

    setQuestions((anciennes) => [
      ...anciennes,
      nouvelleQuestion(clientId),
    ]);

    setErreur("");
  }

  function supprimerQuestion(index) {
    if (questions.length <= 1) {
      setErreur("Le quiz doit contenir au moins une question.");
      return;
    }

    setQuestions((anciennes) => anciennes.filter((_, i) => i !== index));
    setErreur("");
  }

  function modifierQuestion(index, champ, valeur) {
    setQuestions((anciennes) =>
      anciennes.map((question, i) =>
        i === index ? { ...question, [champ]: valeur } : question
      )
    );
  }

  function changerTypeQuestion(indexQuestion, nouveauType) {
    setQuestions((anciennes) =>
      anciennes.map((question, index) => {
        if (index !== indexQuestion) return question;

        if (nouveauType === "vrai_faux") {
          const ancienneCorrecte = question.reponses.find(
            (reponse) => reponse.esCorrect
          );

          return {
            ...question,
            typeQuestion: "vrai_faux",
            reponses: [
              {
                clientId: `${question.clientId}-vrai`,
                libelle: "Vrai",
                esCorrect: ancienneCorrecte
                  ? ancienneCorrecte.libelle.toLowerCase() === "vrai"
                  : false,
              },
              {
                clientId: `${question.clientId}-faux`,
                libelle: "Faux",
                esCorrect: ancienneCorrecte
                  ? ancienneCorrecte.libelle.toLowerCase() === "faux"
                  : false,
              },
            ],
          };
        }

        return {
          ...question,
          typeQuestion: "choix_multiple",
          reponses: [
            {
              clientId: `${question.clientId}-r-${Date.now()}-1`,
              libelle: "",
              esCorrect: false,
            },
            {
              clientId: `${question.clientId}-r-${Date.now()}-2`,
              libelle: "",
              esCorrect: false,
            },
          ],
        };
      })
    );

    setErreur("");
  }

  function ajouterReponse(indexQuestion) {
    setQuestions((anciennes) =>
      anciennes.map((question, index) => {
        if (index !== indexQuestion) return question;
        if (question.typeQuestion === "vrai_faux") return question;

        const clientId = `${question.clientId}-r-${question.reponses.length + 1}-${Date.now()}`;

        return {
          ...question,
          reponses: [
            ...question.reponses,
            { clientId, libelle: "", esCorrect: false },
          ],
        };
      })
    );
  }

  function modifierReponse(indexQuestion, indexReponse, champ, valeur) {
    setQuestions((anciennes) =>
      anciennes.map((question, index) => {
        if (index !== indexQuestion) return question;

        if (
          question.typeQuestion === "vrai_faux" &&
          champ !== "esCorrect"
        ) {
          return question;
        }

        if (
          question.typeQuestion === "vrai_faux" &&
          champ === "esCorrect"
        ) {
          return {
            ...question,
            reponses: question.reponses.map((reponse, i) => ({
              ...reponse,
              esCorrect: i === indexReponse ? valeur : false,
            })),
          };
        }

        return {
          ...question,
          reponses: question.reponses.map((reponse, i) =>
            i === indexReponse
              ? { ...reponse, [champ]: valeur }
              : reponse
          ),
        };
      })
    );

    setErreur("");
  }

  function supprimerReponse(indexQuestion, indexReponse) {
    setQuestions((anciennes) =>
      anciennes.map((question, index) => {
        if (index !== indexQuestion) return question;
        if (question.typeQuestion === "vrai_faux") return question;
        if (question.reponses.length <= 2) return question;

        return {
          ...question,
          reponses: question.reponses.filter(
            (_, i) => i !== indexReponse
          ),
        };
      })
    );
  }

  function validerFormulaire() {
    if (!numFormation) return "Veuillez sélectionner une formation.";

    if (!nomQuiz.trim()) return "Veuillez saisir le nom du quiz.";

    if (!duree || Number(duree) <= 0) {
      return "La durée doit être supérieure à zéro.";
    }

    if (
      seuilReussite === "" ||
      Number(seuilReussite) < 0 ||
      Number(seuilReussite) > 100
    ) {
      return "Le seuil de réussite doit être compris entre 0 et 100.";
    }

    if (questions.length === 0) {
      return "Ajoutez au moins une question.";
    }

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];

      if (!question.enonce.trim()) {
        return `Veuillez saisir l'énoncé de la question ${i + 1}.`;
      }

      if (Number(question.points) <= 0) {
        return `Le nombre de points de la question ${i + 1} doit être positif.`;
      }

      if (question.typeQuestion === "vrai_faux") {
        if (question.reponses.length !== 2) {
          return `La question ${i + 1} de type Vrai/Faux doit contenir exactement deux propositions.`;
        }

        const labelsCorrects = question.reponses.map((reponse) =>
          reponse.libelle.trim().toLowerCase()
        );

        if (
          labelsCorrects[0] !== "vrai" ||
          labelsCorrects[1] !== "faux"
        ) {
          return `Les propositions de la question ${i + 1} doivent être Vrai et Faux.`;
        }

        if (
          question.reponses.filter((reponse) => reponse.esCorrect).length !== 1
        ) {
          return `Sélectionnez une seule bonne réponse pour la question Vrai/Faux ${i + 1}.`;
        }
      } else {
        if (question.reponses.length < 2) {
          return `La question ${i + 1} doit avoir au moins deux réponses.`;
        }

        if (
          question.reponses.some(
            (reponse) => !reponse.libelle.trim()
          )
        ) {
          return `Veuillez compléter toutes les réponses de la question ${i + 1}.`;
        }

        if (
          !question.reponses.some((reponse) => reponse.esCorrect)
        ) {
          return `Sélectionnez au moins une bonne réponse pour la question ${i + 1}.`;
        }
      }
    }

    return "";
  }

  async function enregistrerQuiz(event) {
    event.preventDefault();

    if (enregistrement) return;

    setErreur("");
    setSucces("");

    const messageErreur = validerFormulaire();

    if (messageErreur) {
      setErreur(messageErreur);
      return;
    }

    try {
      setEnregistrement(true);

      const quizCree = await requete("/quiz", {
        method: "POST",
        body: JSON.stringify({
          nomQuiz: nomQuiz.trim(),
          descriptionQuiz: descriptionQuiz.trim(),
          duree: Number(duree),
          seuilReussite: Number(seuilReussite),
          numFormation: Number(numFormation),
          typeQuiz: "final",
        }),
      });

      const codeQuiz = extraireIdentifiant(quizCree, ["codeQuiz"]);

      if (codeQuiz === null) {
        throw new Error(
          "Le quiz a été envoyé, mais son identifiant est introuvable dans la réponse du serveur. Vérifiez le contrôleur POST /quiz."
        );
      }

      for (let i = 0; i < questions.length; i += 1) {
        const question = questions[i];

        const questionCreee = await requete("/questions", {
          method: "POST",
          body: JSON.stringify({
            codeQuiz,
            typeQuestion: question.typeQuestion,
            enonce: question.enonce.trim(),
            points: Number(question.points),
          }),
        });

        const numQuestion = extraireIdentifiant(questionCreee, [
          "numQuestion",
          "idQuestion",
        ]);

        if (numQuestion === null) {
          throw new Error(
            `La question ${i + 1} a été créée, mais son identifiant est introuvable. Vérifiez le contrôleur POST /questions.`
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
      }

      setSucces(
        "Le quiz final et toutes ses questions ont été enregistrés avec succès."
      );

      setTimeout(() => router.push("/dashboard/formateur/quiz"), 1200);
    } catch (error) {
      setErreur(
        error.message ||
          "Une erreur est survenue pendant l'enregistrement du quiz."
      );
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          href="/dashboard/formateur/quiz"
          className={styles.backLink}
        >
          <Icon name="back" size={18} />
          Retour à la gestion des quiz
        </Link>

        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              ESPACE FORMATEUR
            </div>

            <h1 className={styles.title}>Créer un quiz final</h1>

            <p className={styles.subtitle}>
              Préparez une évaluation pour vérifier les connaissances acquises
              à la fin d&apos;une formation.
            </p>
          </div>

          <div className={styles.headerIcon}>
            <Icon name="quiz" size={35} />
          </div>
        </header>

        {erreur && (
          <div className={styles.alertError} role="alert">
            <Icon name="alert" size={20} />
            <span>{erreur}</span>
            <button
              type="button"
              onClick={() => setErreur("")}
              aria-label="Fermer le message"
            >
              ×
            </button>
          </div>
        )}

        {succes && (
          <div className={styles.alertSuccess} role="status">
            <Icon name="check" size={20} />
            <span>{succes}</span>
          </div>
        )}

        <div className={styles.layout}>
          <form className={styles.form} onSubmit={enregistrerQuiz}>
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionNumber}>01</div>
                <div>
                  <h2>Informations du quiz</h2>
                  <p>
                    Définissez les informations générales de
                    l&apos;évaluation.
                  </p>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="formation">
                  Formation concernée <span>*</span>
                </label>

                <select
                  id="formation"
                  value={numFormation}
                  onChange={(e) => setNumFormation(e.target.value)}
                  disabled={chargement || enregistrement}
                  required
                >
                  <option value="">
                    {chargement
                      ? "Chargement des formations..."
                      : "Sélectionner une formation"}
                  </option>

                  {formations.map((formation) => (
                    <option
                      key={
                        formation.numFormation ??
                        formation.id ??
                        formation.titre
                      }
                      value={formation.numFormation}
                    >
                      {formation.titre ||
                        formation.titreFormation ||
                        `Formation ${formation.numFormation}`}
                    </option>
                  ))}
                </select>

                {!chargement && formations.length === 0 && (
                  <small className={styles.fieldHint}>
                    Aucune formation disponible. Vérifiez votre API
                    /formations.
                  </small>
                )}

                {formationSelectionnee && (
                  <div className={styles.selectedFormation}>
                    <Icon name="book" size={17} />
                    <span>
                      Formation sélectionnée :{" "}
                      <strong>
                        {formationSelectionnee.titre ||
                          formationSelectionnee.titreFormation}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="nomQuiz">
                  Nom du quiz <span>*</span>
                </label>

                <input
                  id="nomQuiz"
                  type="text"
                  value={nomQuiz}
                  onChange={(e) => setNomQuiz(e.target.value)}
                  placeholder="Ex : Évaluation finale - Développement Web"
                  maxLength={150}
                  required
                  disabled={enregistrement}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="descriptionQuiz">Description</label>

                <textarea
                  id="descriptionQuiz"
                  value={descriptionQuiz}
                  onChange={(e) => setDescriptionQuiz(e.target.value)}
                  placeholder="Présentez brièvement cette évaluation..."
                  rows={4}
                  maxLength={255}
                  disabled={enregistrement}
                />

                <small className={styles.characterCount}>
                  {descriptionQuiz.length}/255 caractères
                </small>
              </div>

              <div className={styles.twoColumns}>
                <div className={styles.field}>
                  <label htmlFor="duree">
                    <Icon name="clock" size={16} />
                    Durée (minutes) <span>*</span>
                  </label>

                  <input
                    id="duree"
                    type="number"
                    min="1"
                    value={duree}
                    onChange={(e) => setDuree(e.target.value)}
                    required
                    disabled={enregistrement}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="seuil">
                    <Icon name="target" size={16} />
                    Seuil de réussite (%) <span>*</span>
                  </label>

                  <input
                    id="seuil"
                    type="number"
                    min="0"
                    max="100"
                    value={seuilReussite}
                    onChange={(e) => setSeuilReussite(e.target.value)}
                    required
                    disabled={enregistrement}
                  />
                </div>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <div className={styles.sectionNumber}>02</div>
                <div>
                  <h2>Questions et réponses</h2>
                  <p>
                    Ajoutez des questions à choix multiples ou Vrai/Faux.
                  </p>
                </div>
              </div>

              <div className={styles.informationBox}>
                <Icon name="info" size={19} />
                <p>
                  Les questions à choix multiples permettent plusieurs
                  bonnes réponses. Les questions Vrai/Faux proposent
                  uniquement deux choix et une seule réponse correcte.
                </p>
              </div>

              <div className={styles.questionsList}>
                {questions.map((question, indexQuestion) => (
                  <article
                    key={question.clientId}
                    className={styles.questionCard}
                  >
                    <div className={styles.questionHeader}>
                      <div className={styles.questionTitle}>
                        <span className={styles.questionNumber}>
                          {String(indexQuestion + 1).padStart(2, "0")}
                        </span>

                        <div>
                          <h3>Question {indexQuestion + 1}</h3>
                          <span>
                            {question.typeQuestion === "vrai_faux"
                              ? "2 propositions"
                              : `${question.reponses.length} réponses`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.removeQuestion}
                        onClick={() => supprimerQuestion(indexQuestion)}
                        disabled={
                          enregistrement || questions.length <= 1
                        }
                        title="Supprimer la question"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>

                    <div className={styles.field}>
                      <label>
                        Énoncé de la question <span>*</span>
                      </label>

                      <textarea
                        value={question.enonce}
                        onChange={(e) =>
                          modifierQuestion(
                            indexQuestion,
                            "enonce",
                            e.target.value
                          )
                        }
                        placeholder="Saisissez votre question..."
                        rows={3}
                        required
                        disabled={enregistrement}
                      />
                    </div>

                    <div className={styles.questionOptions}>
                      <div className={styles.field}>
                        <label>Type de question</label>

                        <select
                          value={question.typeQuestion}
                          onChange={(e) =>
                            changerTypeQuestion(
                              indexQuestion,
                              e.target.value
                            )
                          }
                          disabled={enregistrement}
                        >
                          <option value="choix_multiple">
                            Choix multiples
                          </option>
                          <option value="vrai_faux">Vrai/Faux</option>
                        </select>
                      </div>

                      <div className={styles.field}>
                        <label>Points attribués</label>

                        <input
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={(e) =>
                            modifierQuestion(
                              indexQuestion,
                              "points",
                              e.target.value
                            )
                          }
                          disabled={enregistrement}
                        />
                      </div>
                    </div>

                    <div className={styles.answersHeader}>
                      <div>
                        <h4>Propositions de réponses</h4>

                        <p>
                          {question.typeQuestion === "vrai_faux"
                            ? "Sélectionnez la seule proposition correcte."
                            : "Cochez toutes les réponses correctes."}
                        </p>
                      </div>

                      <span className={styles.answerCount}>
                        {question.reponses.filter(
                          (reponse) => reponse.esCorrect
                        ).length}{" "}
                        correcte(s)
                      </span>
                    </div>

                    <div className={styles.answersList}>
                      {question.reponses.map(
                        (reponse, indexReponse) => (
                          <div
                            key={reponse.clientId}
                            className={`${styles.answerRow} ${
                              reponse.esCorrect
                                ? styles.correctAnswer
                                : ""
                            }`}
                          >
                            <label
                              className={styles.correctCheckbox}
                              title="Marquer comme bonne réponse"
                            >
                              {question.typeQuestion === "vrai_faux" ? (
                                <input
                                  type="radio"
                                  name={`bonne-reponse-${question.clientId}`}
                                  checked={reponse.esCorrect}
                                  onChange={() =>
                                    modifierReponse(
                                      indexQuestion,
                                      indexReponse,
                                      "esCorrect",
                                      true
                                    )
                                  }
                                  disabled={enregistrement}
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={reponse.esCorrect}
                                  onChange={(e) =>
                                    modifierReponse(
                                      indexQuestion,
                                      indexReponse,
                                      "esCorrect",
                                      e.target.checked
                                    )
                                  }
                                  disabled={enregistrement}
                                />
                              )}

                              <span className={styles.checkboxVisual}>
                                {reponse.esCorrect && (
                                  <Icon name="check" size={14} />
                                )}
                              </span>
                            </label>

                            <span className={styles.answerLetter}>
                              {question.typeQuestion === "vrai_faux"
                                ? indexReponse === 0
                                  ? "V"
                                  : "F"
                                : String.fromCharCode(
                                    65 + indexReponse
                                  )}
                            </span>

                            <input
                              type="text"
                              value={reponse.libelle}
                              onChange={(e) =>
                                modifierReponse(
                                  indexQuestion,
                                  indexReponse,
                                  "libelle",
                                  e.target.value
                                )
                              }
                              placeholder={`Réponse ${indexReponse + 1}`}
                              required
                              disabled={
                                enregistrement ||
                                question.typeQuestion === "vrai_faux"
                              }
                              className={styles.answerInput}
                            />

                            {reponse.esCorrect && (
                              <span className={styles.correctLabel}>
                                Correcte
                              </span>
                            )}

                            {question.typeQuestion ===
                              "choix_multiple" && (
                              <button
                                type="button"
                                className={styles.removeAnswer}
                                onClick={() =>
                                  supprimerReponse(
                                    indexQuestion,
                                    indexReponse
                                  )
                                }
                                disabled={
                                  enregistrement ||
                                  question.reponses.length <= 2
                                }
                                title="Supprimer cette réponse"
                              >
                                <Icon name="trash" size={16} />
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    {question.typeQuestion === "choix_multiple" && (
                      <button
                        type="button"
                        className={styles.addAnswerButton}
                        onClick={() => ajouterReponse(indexQuestion)}
                        disabled={enregistrement}
                      >
                        <Icon name="plus" size={17} />
                        Ajouter une réponse
                      </button>
                    )}
                  </article>
                ))}
              </div>

              <button
                type="button"
                className={styles.addQuestionButton}
                onClick={ajouterQuestion}
                disabled={enregistrement}
              >
                <Icon name="plus" size={19} />
                Ajouter une question
              </button>
            </section>

            <div className={styles.formActions}>
              <Link
                href="/dashboard/formateur/quiz"
                className={styles.cancelButton}
              >
                Annuler
              </Link>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={enregistrement || chargement}
              >
                {enregistrement ? (
                  <span className={styles.loadingContent}>
                    <span className={styles.spinner} />
                    Enregistrement...
                  </span>
                ) : (
                  <span className={styles.loadingContent}>
                    <Icon name="check" size={19} />
                    Enregistrer le quiz final
                  </span>
                )}
              </button>
            </div>
          </form>

          <aside className={styles.sidebar}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeading}>
                <Icon name="quiz" size={21} />
                <h3>Résumé du quiz</h3>
              </div>

              <div className={styles.summaryName}>
                {nomQuiz.trim() || "Nouveau quiz final"}
              </div>

              <div className={styles.summaryFormation}>
                <Icon name="book" size={16} />
                <span>
                  {formationSelectionnee
                    ? formationSelectionnee.titre ||
                      formationSelectionnee.titreFormation
                    : "Aucune formation sélectionnée"}
                </span>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.summaryItem}>
                <span>Questions</span>
                <strong>{nombreQuestions}</strong>
              </div>

              <div className={styles.summaryItem}>
                <span>Réponses</span>
                <strong>{nombreReponses}</strong>
              </div>

              <div className={styles.summaryItem}>
                <span>Bonnes réponses</span>
                <strong>{nombreBonnesReponses}</strong>
              </div>

              <div className={styles.summaryItem}>
                <span>Durée</span>
                <strong>{duree || 0} min</strong>
              </div>

              <div className={styles.summaryItem}>
                <span>Seuil de réussite</span>
                <strong>{seuilReussite || 0}%</strong>
              </div>
            </div>

            <div className={styles.helpCard}>
              <div className={styles.helpIcon}>
                <Icon name="info" size={21} />
              </div>

              <h3>Conseil</h3>

              <p>
                Préparez des questions claires et des propositions
                pertinentes. Pour les questions Vrai/Faux, vérifiez
                soigneusement la réponse sélectionnée.
              </p>
            </div>

            <div className={styles.finalBadge}>
              <Icon name="target" size={19} />

              <div>
                <strong>Évaluation finale</strong>
                <span>Disponible à la fin de la formation</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
