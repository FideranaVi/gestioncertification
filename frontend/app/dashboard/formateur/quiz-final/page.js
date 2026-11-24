
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./quiz-final.module.css";

const API = "http://localhost:5000/api";

export default function QuizFinalPage() {
  const router = useRouter();

  const [numFormation, setNumFormation] = useState("");
  const [token, setToken] = useState("");
  const [formation, setFormation] = useState(null);
  const [dernierModule, setDernierModule] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    nomQuiz: "",
    descriptionQuiz: "",
    duree: 30,
    seuilReussite: 70
  });

  const [questionForm, setQuestionForm] = useState({
    typeQuestion: "QCM",
    enonce: "",
    points: 1,
    reponses: [
      { libelle: "", estCorrecte: true },
      { libelle: "", estCorrecte: false },
      { libelle: "", estCorrecte: false },
      { libelle: "", estCorrecte: false }
    ]
  });

  const request = async (url, options = {}) => {
    const currentToken = localStorage.getItem("token");

    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
        ...options.headers
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || "Une erreur est survenue."
      );
    }

    return result;
  };

  useEffect(() => {
    let active = true;

    const initialiser = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("numFormation");
        const currentToken = localStorage.getItem("token");

        if (!currentToken) {
          router.replace("/connexion");
          return;
        }

        if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
          throw new Error("Identifiant de formation invalide.");
        }

        const result = await fetch(
          `${API}/formateur/formations/${id}/quiz-final`,
          {
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          }
        );

        const data = await result.json().catch(() => ({}));

        if (!result.ok) {
          throw new Error(
            data.message || "Impossible de charger le quiz final."
          );
        }

        if (!active) return;

        setNumFormation(id);
        setToken(currentToken);
        setFormation(data.formation || null);
        setDernierModule(data.dernierModule || null);
        setQuiz(data.quiz || null);

        if (data.quiz) {
          setForm({
            nomQuiz: data.quiz.nomQuiz || "",
            descriptionQuiz: data.quiz.descriptionQuiz || "",
            duree: data.quiz.duree || 30,
            seuilReussite: data.quiz.seuilReussite ?? 70
          });

          const questionResponse = await fetch(
            `${API}/question/quiz/${data.quiz.codeQuiz}`,
            {
              headers: {
                Authorization: `Bearer ${currentToken}`
              }
            }
          );

          const questionData = await questionResponse.json().catch(() => ({}));

          if (questionResponse.ok && active) {
            const liste =
              questionData.data || questionData.questions || [];

            setQuestions(Array.isArray(liste) ? liste : []);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initialiser();

    return () => {
      active = false;
    };
  }, [router]);

  const modifierForm = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const creerQuizFinal = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await request(
        `/formateur/formations/${numFormation}/quiz-final`,
        {
          method: "POST",
          body: JSON.stringify({
            nomQuiz: form.nomQuiz.trim(),
            descriptionQuiz: form.descriptionQuiz.trim(),
            duree: Number(form.duree),
            seuilReussite: Number(form.seuilReussite)
          })
        }
      );

      const nouveauQuiz = result.quiz;

      if (!nouveauQuiz) {
        throw new Error("Le serveur n'a pas retourné le quiz créé.");
      }

      setQuiz(nouveauQuiz);
      setDernierModule(result.dernierModule || dernierModule);

      setSuccess("Quiz final créé avec succès.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modifierReponse = (index, value) => {
    setQuestionForm((previous) => ({
      ...previous,
      reponses: previous.reponses.map((reponse, i) =>
        i === index
          ? { ...reponse, libelle: value }
          : reponse
      )
    }));
  };

  const choisirBonneReponse = (index) => {
    setQuestionForm((previous) => ({
      ...previous,
      reponses: previous.reponses.map((reponse, i) => ({
        ...reponse,
        estCorrecte: i === index
      }))
    }));
  };

  const ajouterQuestion = async (e) => {
    e.preventDefault();

    if (!questionForm.enonce.trim()) {
      setError("Veuillez saisir une question.");
      return;
    }

    const reponses = questionForm.reponses.filter(
      (r) => r.libelle.trim()
    );

    if (reponses.length < 2) {
      setError("Ajoutez au moins deux réponses.");
      return;
    }

    if (!reponses.some((r) => r.estCorrecte)) {
      setError("Sélectionnez une bonne réponse.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const result = await request(
        `/question/quiz/${quiz.codeQuiz}`,
        {
          method: "POST",
          body: JSON.stringify({
            typeQuestion: questionForm.typeQuestion,
            enonce: questionForm.enonce.trim(),
            points: Number(questionForm.points)
          })
        }
      );

      const nouvelleQuestion =
        result.data || result.question || result;

      const idQuestion =
        nouvelleQuestion.numQuestion ||
        nouvelleQuestion.idQuestion;

      if (!idQuestion) {
        throw new Error(
          "Identifiant de question absent de la réponse serveur."
        );
      }

      for (const reponse of reponses) {
        await request(`/reponse/question/${idQuestion}`, {
          method: "POST",
          body: JSON.stringify({
            libelle: reponse.libelle.trim(),
            estCorrecte: reponse.estCorrecte
          })
        });
      }

      setQuestionForm({
        typeQuestion: "QCM",
        enonce: "",
        points: 1,
        reponses: [
          { libelle: "", estCorrecte: true },
          { libelle: "", estCorrecte: false },
          { libelle: "", estCorrecte: false },
          { libelle: "", estCorrecte: false }
        ]
      });

      const refreshed = await request(
        `/question/quiz/${quiz.codeQuiz}`
      );

      const liste =
        refreshed.data || refreshed.questions || [];

      setQuestions(Array.isArray(liste) ? liste : []);
      setSuccess("Question ajoutée avec succès.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const supprimerQuestion = async (id) => {
    if (!window.confirm("Supprimer cette question ?")) return;

    try {
      setError("");
      setSuccess("");

      await request(`/question/${id}`, {
        method: "DELETE"
      });

      setQuestions((previous) =>
        previous.filter(
          (question) =>
            question.numQuestion !== id &&
            question.idQuestion !== id
        )
      );

      setSuccess("Question supprimée avec succès.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className={styles.loading}>
          Chargement du quiz final...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => router.back()}
      >
        ← Retour
      </button>

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            GESTION DES ÉVALUATIONS
          </span>
          <h1>Quiz final de formation</h1>
          <p>
            Créez l&apos;évaluation finale de votre formation.
          </p>
        </div>

        <div className={styles.headerIcon}>✓</div>
      </header>

      {formation && (
        <section className={styles.formationCard}>
          <div>
            <span>FORMATION</span>
            <h2>{formation.titre}</h2>
          </div>

          <div>
            <span>DERNIER MODULE</span>
            <h3>
              {dernierModule?.titreModule || "Non disponible"}
            </h3>
          </div>
        </section>
      )}

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {success && (
        <div className={styles.success}>{success}</div>
      )}

      {!quiz ? (
        <section className={styles.card}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.step}>ÉTAPE 01</span>
              <h2>Créer le quiz final</h2>
              <p>Configurez votre évaluation.</p>
            </div>
          </div>

          <form onSubmit={creerQuizFinal}>
            <div className={styles.formGroup}>
              <label htmlFor="nomQuiz">Titre du quiz</label>
              <input
                id="nomQuiz"
                name="nomQuiz"
                value={form.nomQuiz}
                onChange={modifierForm}
                placeholder="Ex : Évaluation finale - Développement Web"
                maxLength={150}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="descriptionQuiz">Description</label>
              <textarea
                id="descriptionQuiz"
                name="descriptionQuiz"
                value={form.descriptionQuiz}
                onChange={modifierForm}
                rows={4}
                placeholder="Description de l'évaluation..."
              />
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="duree">Durée (minutes)</label>
                <input
                  id="duree"
                  name="duree"
                  type="number"
                  min="1"
                  value={form.duree}
                  onChange={modifierForm}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="seuilReussite">
                  Seuil de réussite (%)
                </label>
                <input
                  id="seuilReussite"
                  name="seuilReussite"
                  type="number"
                  min="0"
                  max="100"
                  value={form.seuilReussite}
                  onChange={modifierForm}
                  required
                />
              </div>
            </div>

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={saving}
            >
              {saving ? "Création..." : "Créer le quiz final →"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className={styles.quizSummary}>
            <div>
              <span className={styles.step}>QUIZ FINAL</span>
              <h2>{quiz.nomQuiz}</h2>
              <p>{quiz.descriptionQuiz}</p>
            </div>

            <div className={styles.stats}>
              <div>
                <strong>{quiz.duree}</strong>
                <span>Minutes</span>
              </div>

              <div>
                <strong>{quiz.seuilReussite}%</strong>
                <span>Réussite</span>
              </div>

              <div>
                <strong>{questions.length}</strong>
                <span>Questions</span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.step}>ÉTAPE 02</span>
                <h2>Ajouter une question</h2>
                <p>Préparez les questions de votre évaluation.</p>
              </div>
            </div>

            <form onSubmit={ajouterQuestion}>
              <div className={styles.formGroup}>
                <label htmlFor="typeQuestion">
                  Type de question
                </label>

                <select
                  id="typeQuestion"
                  value={questionForm.typeQuestion}
                  onChange={(e) =>
                    setQuestionForm((previous) => ({
                      ...previous,
                      typeQuestion: e.target.value
                    }))
                  }
                >
                  <option value="QCM">QCM</option>
                  <option value="Vrai/Faux">Vrai ou Faux</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="enonce">Énoncé</label>
                <textarea
                  id="enonce"
                  rows={3}
                  value={questionForm.enonce}
                  onChange={(e) =>
                    setQuestionForm((previous) => ({
                      ...previous,
                      enonce: e.target.value
                    }))
                  }
                  placeholder="Saisissez votre question..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="points">Points</label>
                <input
                  id="points"
                  type="number"
                  min="1"
                  value={questionForm.points}
                  onChange={(e) =>
                    setQuestionForm((previous) => ({
                      ...previous,
                      points: e.target.value
                    }))
                  }
                />
              </div>

              <div className={styles.answersHeading}>
                <h3>Réponses proposées</h3>
                <span>Choisissez la bonne réponse.</span>
              </div>

              <div className={styles.answersList}>
                {questionForm.reponses.map((reponse, index) => (
                  <div className={styles.answerRow} key={index}>
                    <input
                      type="radio"
                      name="bonneReponse"
                      checked={reponse.estCorrecte}
                      onChange={() => choisirBonneReponse(index)}
                    />

                    <input
                      type="text"
                      value={reponse.libelle}
                      onChange={(e) =>
                        modifierReponse(index, e.target.value)
                      }
                      placeholder={`Réponse ${index + 1}`}
                    />

                    {reponse.estCorrecte && (
                      <span className={styles.correctLabel}>
                        Bonne réponse
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <button
                className={styles.primaryButton}
                type="submit"
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "+ Ajouter la question"}
              </button>
            </form>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.step}>ÉTAPE 03</span>
                <h2>Questions enregistrées</h2>
                <p>Gérez les questions de votre quiz final.</p>
              </div>

              <span className={styles.questionCount}>
                {questions.length} question(s)
              </span>
            </div>

            {questions.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>?</div>
                <h3>Aucune question</h3>
                <p>Ajoutez votre première question.</p>
              </div>
            ) : (
              <div className={styles.questionsList}>
                {questions.map((question, index) => (
                  <article
                    className={styles.questionItem}
                    key={question.numQuestion || question.idQuestion || index}
                  >
                    <div className={styles.questionTop}>
                      <span>QUESTION {index + 1}</span>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() =>
                          supprimerQuestion(
                            question.numQuestion || question.idQuestion
                          )
                        }
                      >
                        Supprimer
                      </button>
                    </div>

                    <h3>{question.enonce}</h3>

                    <div className={styles.questionMeta}>
                      <span>{question.typeQuestion}</span>
                      <span>{question.points} point(s)</span>
                    </div>

                    <div className={styles.savedAnswers}>
                      {(question.reponses || []).map((reponse, i) => (
                        <div
                          key={reponse.numReponse || i}
                          className={
                            reponse.estCorrecte
                              ? styles.savedAnswerCorrect
                              : styles.savedAnswer
                          }
                        >
                          <span>
                            {reponse.estCorrecte ? "✓" : "○"}
                          </span>
                          {reponse.libelle}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
