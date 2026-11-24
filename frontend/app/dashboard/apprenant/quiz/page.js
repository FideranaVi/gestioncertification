"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./quiz.module.css";

const API = "http://localhost:5000/api/apprenant";

function obtenirToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
}

async function requete(url, options = {}) {
  const token = obtenirToken();

  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const texte = await response.text();
  let data = {};

  try {
    data = texte ? JSON.parse(texte) : {};
  } catch {
    data = { message: texte };
  }

  if (!response.ok) {
    const error = new Error(data.message || data.error || "Une erreur est survenue.");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.quiz)) return data.quiz;
  if (Array.isArray(data?.quizzes)) return data.quizzes;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.quiz)) return data.data.quiz;
  if (Array.isArray(data?.data?.quizzes)) return data.data.quizzes;
  return [];
}

function envoyerActivite(idTentative, type, extra = {}) {
  try {
    const token = obtenirToken();

    fetch(`${API}/tentatives/${idTentative}/activite`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type, ...extra }),
    }).catch(() => {});
  } catch {}
}

const estObjet = (valeur) =>
  valeur !== null && typeof valeur === "object" && !Array.isArray(valeur);

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeQuizParam = searchParams.get("codeQuiz");

  const [quizListe, setQuizListe] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [tentative, setTentative] = useState(null);
  const [reponses, setReponses] = useState({});
  const [resultat, setResultat] = useState(null);

  const [chargement, setChargement] = useState(true);
  const [demarrage, setDemarrage] = useState(false);
  const [soumission, setSoumission] = useState(false);

  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [dureeRestante, setDureeRestante] = useState(null);
  const [nbSorties, setNbSorties] = useState(0);
  const [avertissement, setAvertissement] = useState("");

  const soumissionRef = useRef(false);
  const quizLanceRef = useRef("");
  const resultatRef = useRef(false);
  const demarrageRef = useRef(false);

  useEffect(() => {
    resultatRef.current = Boolean(resultat);
  }, [resultat]);

  const chargerQuiz = useCallback(async () => {
    try {
      const data = await requete("/quiz");
      setQuizListe(extraireListe(data));
      setErreur("");
    } catch (error) {
      setErreur(error.message || "Impossible de charger les quiz.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    let annule = false;

    const timer = setTimeout(async () => {
      if (!annule) await chargerQuiz();
    }, 0);

    return () => {
      annule = true;
      clearTimeout(timer);
    };
  }, [chargerQuiz]);

  const afficherResultat = useCallback((data) => {
    const interne =
      [
        data?.evaluation,
        data?.data,
        estObjet(data?.resultat) ? data.resultat : null,
      ].find(estObjet) || {};

    setResultat({ ...interne, ...data });
    setTentative(null);
    setDureeRestante(null);
    setMessage("");

    resultatRef.current = true;
    soumissionRef.current = false;
  }, []);

  const commencerQuiz = useCallback(
    async (codeQuiz) => {
      if (
        !codeQuiz ||
        demarrageRef.current ||
        quizLanceRef.current === String(codeQuiz)
      ) {
        return;
      }

      const quizDansListe = quizListe.find(
        (item) => String(item.codeQuiz) === String(codeQuiz)
      );

      const dejaReussi =
        quizDansListe?.reussi === true ||
        quizDansListe?.estReussi === true;

      if (dejaReussi) {
        setErreur("Vous avez déjà réussi ce quiz. Il n'est plus accessible.");
        return;
      }

      const accessible =
        quizDansListe?.accessible !== false &&
        quizDansListe?.disponible !== false &&
        quizDansListe?.estDisponible !== false;

      if (quizDansListe && !accessible) {
        setErreur(
          "Ce quiz n'est pas encore accessible. Terminez les étapes requises de la formation."
        );
        return;
      }

      demarrageRef.current = true;
      quizLanceRef.current = String(codeQuiz);

      setDemarrage(true);
      setErreur("");
      setMessage("");
      setResultat(null);
      setReponses({});
      setQuiz(null);
      setTentative(null);
      setDureeRestante(null);
      setNbSorties(0);
      setAvertissement("");

      resultatRef.current = false;
      soumissionRef.current = false;

      try {
        const data = await requete("/tentatives", {
          method: "POST",
          body: JSON.stringify({ codeQuiz: Number(codeQuiz) }),
        });

        if (data.tentativeTerminee) {
          afficherResultat(data);
          return;
        }

        const tentativeData =
          data.tentative ||
          data.data?.tentative ||
          (data.idTentative ? data : null);

        const quizData = data.quiz || data.data?.quiz || null;

        if (!tentativeData?.idTentative) {
          throw new Error("L'identifiant de la tentative est introuvable.");
        }

        if (!quizData) {
          throw new Error("Les informations du quiz sont introuvables.");
        }

        setTentative(tentativeData);
        setQuiz(quizData);

        if (data.reprise) {
          envoyerActivite(tentativeData.idTentative, "retour");
        }

        const anciennesReponses =
          data.reponsesSauvegardees ||
          tentativeData.reponsesSauvegardees ||
          [];

        if (Array.isArray(anciennesReponses)) {
          const regroupees = {};

          anciennesReponses.forEach((item) => {
            if (item.numQuestion === undefined) return;

            const cle = Number(item.numQuestion);
            const valeurs = Array.isArray(item.numReponses)
              ? item.numReponses.map(Number)
              : item.numReponse !== undefined && item.numReponse !== null
                ? [Number(item.numReponse)]
                : [];

            regroupees[cle] = [
              ...new Set([...(regroupees[cle] || []), ...valeurs]),
            ];
          });

          setReponses(regroupees);
        }

        const duree = data.dureeRestante ?? tentativeData.dureeRestante;

        if (duree !== undefined && duree !== null) {
          setDureeRestante(Math.max(0, Number(duree)));
        } else if (quizData.duree !== undefined && quizData.duree !== null) {
          setDureeRestante(Math.max(0, Number(quizData.duree) * 60));
        }
      } catch (error) {
        if (error.status === 409 && error.data?.tentativeTerminee) {
          afficherResultat(error.data);
        } else {
          setErreur(error.message || "Impossible de démarrer le quiz.");
          quizLanceRef.current = "";
        }
      } finally {
        demarrageRef.current = false;
        setDemarrage(false);
      }
    },
    [afficherResultat, quizListe]
  );

  useEffect(() => {
    if (!codeQuizParam || chargement) return;

    let annule = false;

    const timer = setTimeout(() => {
      if (!annule) commencerQuiz(codeQuizParam);
    }, 0);

    return () => {
      annule = true;
      clearTimeout(timer);
    };
  }, [codeQuizParam, commencerQuiz, chargement]);

  const questions = useMemo(() => {
    if (!quiz) return [];
    if (Array.isArray(quiz.questions)) return quiz.questions;
    if (Array.isArray(quiz.Question)) return quiz.Question;
    if (Array.isArray(quiz.question)) return quiz.question;
    return [];
  }, [quiz]);

  const nombreReponses = useMemo(
    () =>
      Object.values(reponses).filter(
        (liste) => Array.isArray(liste) && liste.length > 0
      ).length,
    [reponses]
  );

  const formaterTemps = useCallback((secondes) => {
    if (secondes === null || secondes === undefined) return "--:--";

    const valeur = Math.max(0, Math.floor(secondes));
    const minutes = Math.floor(valeur / 60);
    const reste = valeur % 60;

    return `${String(minutes).padStart(2, "0")}:${String(reste).padStart(2, "0")}`;
  }, []);

  const soumettreQuiz = useCallback(
    async (automatique = false) => {
      if (
        !tentative?.idTentative ||
        soumissionRef.current ||
        resultatRef.current
      ) {
        return;
      }

      soumissionRef.current = true;
      setSoumission(true);
      setErreur("");
      setMessage(
        automatique
          ? "Le temps est écoulé. Soumission du quiz..."
          : "Soumission de vos réponses..."
      );

      const reponsesFinales = Object.entries(reponses).map(
        ([numQuestion, numReponses]) => ({
          numQuestion: Number(numQuestion),
          numReponses: Array.isArray(numReponses)
            ? numReponses.map(Number)
            : [],
        })
      );

      try {
        const data = await requete(
          `/tentatives/${tentative.idTentative}/soumettre`,
          {
            method: "POST",
            body: JSON.stringify({ reponses: reponsesFinales }),
          }
        );

        afficherResultat(data);
        await chargerQuiz();
      } catch (error) {
        if (error.status === 409 && error.data?.tentativeTerminee) {
          afficherResultat(error.data);
          await chargerQuiz();
        } else {
          soumissionRef.current = false;
          setErreur(error.message || "Impossible de soumettre le quiz.");
          setMessage("");
        }
      } finally {
        setSoumission(false);
      }
    },
    [tentative, reponses, afficherResultat, chargerQuiz]
  );

  useEffect(() => {
    if (
      dureeRestante === null ||
      dureeRestante <= 0 ||
      !tentative ||
      resultat ||
      soumission
    ) {
      return;
    }

    const interval = setInterval(() => {
      setDureeRestante((ancienneValeur) =>
        ancienneValeur === null ? null : Math.max(0, ancienneValeur - 1)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [dureeRestante, tentative, resultat, soumission]);

  useEffect(() => {
    if (
      dureeRestante !== 0 ||
      !tentative ||
      resultat ||
      soumission ||
      soumissionRef.current
    ) {
      return;
    }

    const timer = setTimeout(() => soumettreQuiz(true), 0);

    return () => clearTimeout(timer);
  }, [dureeRestante, tentative, resultat, soumission, soumettreQuiz]);

  useEffect(() => {
    if (!tentative?.idTentative || resultat) return;

    const idTentative = tentative.idTentative;
    let sortie = null;
    let timerBlur = null;

    const commencerSortie = (type) => {
      if (sortie) return;
      sortie = { type, debut: Date.now() };
      envoyerActivite(idTentative, type);
      setNbSorties((n) => n + 1);
    };

    const terminerSortie = () => {
      if (!sortie) return;

      const dureeSecondes = Math.round((Date.now() - sortie.debut) / 1000);
      sortie = null;

      envoyerActivite(idTentative, "retour", { dureeSecondes });
      setAvertissement(
        `Vous avez quitté l'écran du quiz pendant ${dureeSecondes} s.`
      );
    };

    const surVisibilite = () => {
      if (document.hidden) {
        clearTimeout(timerBlur);
        commencerSortie("sortie_onglet");
      } else {
        terminerSortie();
      }
    };

    const surBlur = () => {
      clearTimeout(timerBlur);
      timerBlur = setTimeout(() => {
        if (!document.hidden) commencerSortie("sortie_fenetre");
      }, 300);
    };

    const surFocus = () => {
      clearTimeout(timerBlur);
      if (!document.hidden) terminerSortie();
    };

    const surQuitter = () => {
      if (!sortie) envoyerActivite(idTentative, "page_quittee");
    };

    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("blur", surBlur);
    window.addEventListener("focus", surFocus);
    window.addEventListener("pagehide", surQuitter);

    return () => {
      clearTimeout(timerBlur);
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("blur", surBlur);
      window.removeEventListener("focus", surFocus);
      window.removeEventListener("pagehide", surQuitter);
    };
  }, [tentative, resultat]);

  const estQuestionMultiple = useCallback((question) => {
    const type = String(
      question.typeQuestion || question.type || ""
    ).toLowerCase();

    return (
      type.includes("multiple") ||
      type.includes("plusieurs") ||
      type.includes("checkbox")
    );
  }, []);

  const changerReponse = useCallback(
    (numQuestion, numReponse, multiple) => {
      if (
        soumission ||
        resultat ||
        soumissionRef.current ||
        !tentative?.idTentative
      ) {
        return;
      }

      const actuelles = reponses[numQuestion] || [];
      const numero = Number(numReponse);

      const nouvelles = !multiple
        ? [numero]
        : actuelles.includes(numero)
          ? actuelles.filter((item) => item !== numero)
          : [...actuelles, numero];

      setReponses((anciennes) => ({
        ...anciennes,
        [numQuestion]: nouvelles,
      }));

      requete(`/tentatives/${tentative.idTentative}/reponses`, {
        method: "PATCH",
        body: JSON.stringify({
          reponses: [{ numQuestion: Number(numQuestion), numReponses: nouvelles }],
        }),
      }).catch((error) => {
        if (error.status === 409 && error.data?.tentativeTerminee) {
          afficherResultat(error.data);
        }
      });
    },
    [soumission, resultat, tentative, reponses, afficherResultat]
  );

  const obtenirChoix = (question) => {
    if (Array.isArray(question.reponses)) return question.reponses;
    if (Array.isArray(question.Reponses)) return question.Reponses;
    if (Array.isArray(question.options)) return question.options;
    return [];
  };

  const obtenirNumeroQuestion = (question, index) =>
    question.numQuestion ?? question.idQuestion ?? index + 1;

  const obtenirNumeroReponse = (reponse, index) =>
    reponse.numReponse ?? reponse.idReponse ?? index + 1;

  const obtenirTexteReponse = (reponse) =>
    reponse.libelle ||
    reponse.libelleReponse ||
    reponse.texteReponse ||
    reponse.contenu ||
    reponse.texte ||
    "";

  const obtenirScore = () => {
    const valeur =
      resultat?.score ??
      resultat?.note ??
      resultat?.scoreObtenu ??
      resultat?.tentative?.score ??
      resultat?.evaluation?.score ??
      0;

    const nombre = Number(valeur);
    return Number.isFinite(nombre) ? nombre : 0;
  };

  const obtenirSeuil = () => {
    const nombre = Number(
      resultat?.seuilReussite ??
        resultat?.quiz?.seuilReussite ??
        quiz?.seuilReussite ??
        0
    );

    return Number.isFinite(nombre) ? nombre : 0;
  };

  const obtenirReussite = () => {
    if (resultat?.resultat === "reussi") return true;
    if (resultat?.resultat === "echoue") return false;
    if (resultat?.reussi !== undefined) return Boolean(resultat.reussi);
    if (resultat?.estReussi !== undefined) return Boolean(resultat.estReussi);
    if (resultat?.success !== undefined) return Boolean(resultat.success);
    return obtenirSeuil() > 0 && obtenirScore() >= obtenirSeuil();
  };

  const retournerListe = () => {
    quizLanceRef.current = "";
    resultatRef.current = false;
    soumissionRef.current = false;

    setResultat(null);
    setQuiz(null);
    setTentative(null);
    setReponses({});
    setDureeRestante(null);
    setErreur("");
    setMessage("");
    setChargement(true);

    chargerQuiz();
    router.push("/dashboard/apprenant/quiz");
  };

  const allerDashboard = () => {
    router.push("/dashboard/apprenant");
  };

  if (chargement && !codeQuizParam) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState}>
          <span className={styles.loader} />
          <p>Chargement des quiz...</p>
        </div>
      </main>
    );
  }

  if (demarrage && !quiz && !resultat) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingState}>
          <span className={styles.loader} />
          <p>Préparation de votre quiz...</p>
        </div>
      </main>
    );
  }

  if (resultat) {
    const reussi = obtenirReussite();
    const seuil = obtenirSeuil();
    const pointsObtenus = resultat.pointsObtenus;
    const pointsTotal = resultat.pointsTotal;

    return (
      <main className={styles.page}>
        <section className={styles.resultCard}>
          <div className={styles.resultContent}>
            <div
              className={`${styles.resultIcon} ${
                reussi ? styles.resultPassed : styles.resultFailed
              }`}
            >
              {reussi ? "✓" : "!"}
            </div>

            <h1 className={styles.pageTitle}>
              {reussi ? "Félicitations !" : "Quiz terminé"}
            </h1>

            <p className={styles.subtitle}>
              {resultat.nomQuiz
                ? `${resultat.nomQuiz} : votre tentative a été enregistrée.`
                : "Votre tentative a été enregistrée."}
            </p>

            <div
              className={`${styles.score} ${
                reussi ? styles.scorePassed : styles.scoreFailed
              }`}
            >
              {obtenirScore()} %
            </div>

            <p className={styles.muted}>Score obtenu</p>

            {pointsObtenus !== undefined && pointsTotal !== undefined && (
              <p className={styles.points}>
                {pointsObtenus} / {pointsTotal} points
              </p>
            )}

            {seuil > 0 && (
              <p className={styles.threshold}>
                Seuil de réussite : <strong>{seuil} %</strong>
              </p>
            )}

            <div
              className={`${styles.resultMessage} ${
                reussi ? styles.passedMessage : styles.failedMessage
              }`}
            >
              {reussi
                ? "Vous avez réussi cette évaluation. Ce quiz est maintenant validé et ne pourra plus être recommencé."
                : "Vous n'avez pas atteint le seuil de réussite."}
            </div>

            {resultat.certificat && (
              <p className={styles.certificateNotice}>
                Un certificat a été généré pour cette formation.
              </p>
            )}

            <div className={styles.actions}>
              {reussi && resultat.certificat && (
                <button
                  className={styles.primaryButton}
                  onClick={() => router.push("/dashboard/apprenant/certificats")}
                >
                  Voir mes certificats
                </button>
              )}

              <button
                className={styles.secondaryButton}
                onClick={retournerListe}
              >
                Retour aux quiz
              </button>

              <button
                className={styles.dashboardButton}
                onClick={allerDashboard}
              >
                <span className={styles.dashboardButtonIcon}>⌂</span>
                Tableau de bord
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (quiz && tentative) {
    const urgent = dureeRestante !== null && dureeRestante <= 60;

    return (
      <main className={styles.page}>
        <header className={styles.quizHeader}>
          <div className={styles.quizHeaderText}>
            <h1 className={styles.pageTitle}>
              {quiz.nomQuiz || quiz.titre || "Évaluation"}
            </h1>

            <p className={styles.subtitle}>
              {quiz.descriptionQuiz ||
                quiz.description ||
                "Répondez aux questions ci-dessous."}
            </p>

            <button
              className={styles.dashboardButton}
              onClick={allerDashboard}
            >
              <span className={styles.dashboardButtonIcon}>⌂</span>
              Tableau de bord
            </button>
          </div>

          <div className={`${styles.timer} ${urgent ? styles.timerUrgent : ""}`}>
            <span className={styles.timerLabel}>Temps restant</span>
            <span className={styles.timerValue}>
              {formaterTemps(dureeRestante)}
            </span>
          </div>
        </header>

        {erreur && <div className={styles.errorNotice}>{erreur}</div>}
        {message && <div className={styles.infoNotice}>{message}</div>}

        <div className={styles.warningNotice}>
          <strong>Surveillance du quiz</strong>
          <p>
            Tout changement d&apos;onglet ou sortie de l&apos;écran est
            enregistré et visible par votre formateur.
          </p>
          {avertissement && <p>{avertissement}</p>}
          {nbSorties > 0 && (
            <p>
              Sorties enregistrées : <strong>{nbSorties}</strong>
            </p>
          )}
        </div>

        <section className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <strong>Votre progression</strong>
            <span>
              {nombreReponses} / {questions.length} questions répondues
            </span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: questions.length
                  ? `${(nombreReponses / questions.length) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </section>

        {questions.length === 0 ? (
          <section className={styles.card}>
            Aucune question n&apos;est disponible pour ce quiz.
          </section>
        ) : (
          questions.map((question, index) => {
            const numero = obtenirNumeroQuestion(question, index);
            const choix = obtenirChoix(question);
            const multiple = estQuestionMultiple(question);
            const selection = reponses[numero] || [];

            return (
              <section key={numero} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>{index + 1}</span>

                  <div className={styles.questionTextBlock}>
                    <h3 className={styles.questionTitle}>
                      {question.enonce ||
                        question.libelleQuestion ||
                        question.texteQuestion ||
                        question.question ||
                        `Question ${index + 1}`}
                    </h3>

                    <span className={styles.questionType}>
                      {multiple
                        ? "Plusieurs réponses possibles"
                        : "Une seule réponse"}
                    </span>
                  </div>
                </div>

                <div className={styles.optionsList}>
                  {choix.map((reponse, indexReponse) => {
                    const numeroReponse = obtenirNumeroReponse(
                      reponse,
                      indexReponse
                    );

                    const coche = selection.includes(Number(numeroReponse));

                    return (
                      <label
                        key={numeroReponse}
                        className={`${styles.option} ${
                          coche ? styles.optionSelected : ""
                        } ${soumission ? styles.optionDisabled : ""}`}
                      >
                        <input
                          type={multiple ? "checkbox" : "radio"}
                          name={`question-${numero}`}
                          checked={coche}
                          disabled={soumission}
                          onChange={() =>
                            changerReponse(numero, numeroReponse, multiple)
                          }
                          className={styles.optionInput}
                        />

                        <span className={styles.optionText}>
                          {obtenirTexteReponse(reponse)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        <section className={styles.submitCard}>
          <div className={styles.submitInfo}>
            <strong>{nombreReponses} réponse(s) sélectionnée(s)</strong>
            <p>Vérifiez vos réponses avant de terminer.</p>
          </div>

          <button
            className={`${styles.primaryButton} ${
              soumission ? styles.buttonDisabled : ""
            }`}
            disabled={soumission || questions.length === 0}
            onClick={() => soumettreQuiz(false)}
          >
            {soumission ? "Soumission..." : "Terminer le quiz"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.listHeader}>
        <div>
          <h1 className={styles.pageTitle}>Mes quiz</h1>
          <p className={styles.subtitle}>
            Consultez les évaluations disponibles et testez vos connaissances.
          </p>
        </div>

        <button
          className={styles.dashboardButton}
          onClick={allerDashboard}
        >
          <span className={styles.dashboardButtonIcon}>⌂</span>
          Tableau de bord
        </button>
      </header>

      {erreur && <div className={styles.errorNotice}>{erreur}</div>}

      {demarrage && (
        <div className={styles.infoNotice}>Préparation de votre quiz...</div>
      )}

      {!chargement && quizListe.length === 0 && (
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon}>Q</div>
          <h2>Aucun quiz disponible</h2>
          <p>
            Les évaluations apparaîtront ici lorsque les conditions d&apos;accès
            seront remplies.
          </p>
        </section>
      )}

      <div className={styles.quizList}>
        {quizListe.map((item, index) => {
          const codeQuiz = item.codeQuiz;

          const dejaReussi =
            item.reussi === true || item.estReussi === true;

          const accessible =
            item.accessible !== false &&
            item.disponible !== false &&
            item.estDisponible !== false &&
            !dejaReussi;

          return (
            <section
              key={codeQuiz ?? index}
              className={`${styles.quizCard} ${
                dejaReussi ? styles.quizCardPassed : ""
              }`}
            >
              <div className={styles.quizCardContent}>
                <div className={styles.quizCardHeading}>
                  <h2 className={styles.quizName}>
                    {item.nomQuiz || item.titre || `Quiz ${index + 1}`}
                  </h2>

                  <span
                    className={`${styles.statusBadge} ${
                      dejaReussi
                        ? styles.statusPassed
                        : accessible
                          ? styles.statusAvailable
                          : styles.statusLocked
                    }`}
                  >
                    {dejaReussi
                      ? "Réussi"
                      : accessible
                        ? "Disponible"
                        : "Non disponible"}
                  </span>
                </div>

                <p className={styles.quizDescription}>
                  {item.descriptionQuiz ||
                    item.description ||
                    "Évaluation de vos connaissances."}
                </p>

                <div className={styles.quizMeta}>
                  {item.duree !== undefined && item.duree !== null && (
                    <span>
                      <span className={styles.metaLabel}>Durée</span>
                      {item.duree} min
                    </span>
                  )}

                  {item.seuilReussite !== undefined &&
                    item.seuilReussite !== null && (
                      <span>
                        <span className={styles.metaLabel}>Seuil</span>
                        {item.seuilReussite} %
                      </span>
                    )}

                  {item.nombreQuestions !== undefined && (
                    <span>
                      <span className={styles.metaLabel}>Questions</span>
                      {item.nombreQuestions}
                    </span>
                  )}
                </div>

                {dejaReussi ? (
                  <div className={styles.passedDescription}>
                    <span className={styles.passedIcon}>✓</span>
                    <p>
                      Vous avez déjà validé cette évaluation. Vous ne pouvez plus
                      la recommencer.
                    </p>
                  </div>
                ) : !accessible ? (
                  <div className={styles.lockedDescription}>
                    <span className={styles.lockIcon}>⌑</span>
                    <p>
                      Ce quiz est verrouillé. Terminez les modules et les étapes
                      requises de la formation pour y accéder.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className={styles.quizCardActions}>
                <button
                  className={`${styles.primaryButton} ${
                    dejaReussi || !accessible ? styles.buttonDisabled : ""
                  } ${dejaReussi ? styles.buttonPassed : ""}`}
                  disabled={!accessible || dejaReussi || demarrage}
                  onClick={() => commencerQuiz(codeQuiz)}
                >
                  {dejaReussi
                    ? "✓ Quiz validé"
                    : demarrage
                      ? "Chargement..."
                      : accessible
                        ? "Commencer le quiz"
                        : "Quiz verrouillé"}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.loadingState}>
            <span className={styles.loader} />
            <p>Chargement...</p>
          </div>
        </main>
      }
    >
      <QuizContent />
    </Suspense>
  );
}