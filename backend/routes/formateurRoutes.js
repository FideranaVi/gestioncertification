const express = require("express");
const router = express.Router();
const evaluationController = require("../controllers/evaluationController");
const certificatController = require("../controllers/certificatController");
const quizFinalController = require("../controllers/quizFinalController");
const tentativeQuizController = require("../controllers/tentativeQuizController");

const {
  obtenirDashboardFormateur,
  obtenirModulesFormateur
} = require("../controllers/formateurController");

const quizController = require("../controllers/quizController");
const questionController = require("../controllers/questionController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

// ======================================================
// AUTHENTIFICATION ET AUTORISATION
// ======================================================

router.use(authMiddleware);
router.use(verifierRole("formateur"));

// ======================================================
// DASHBOARD
// ======================================================

router.get("/dashboard", obtenirDashboardFormateur);
router.get("/modules", obtenirModulesFormateur);

// ======================================================
// QUIZ
// ======================================================

router.get("/quiz/statistiques", quizController.obtenirStatistiquesQuiz);
router.get("/quiz", quizController.obtenirQuiz);
router.get("/quiz/:id", quizController.obtenirQuizParId);
router.post("/quiz", quizController.ajouterQuiz);
router.put("/quiz/:id", quizController.modifierQuiz);
router.delete("/quiz/:id", quizController.supprimerQuiz);

// ======================================================
// QUESTIONS
// ======================================================

router.get("/questions", questionController.obtenirQuestions);
router.get("/questions/:id", questionController.obtenirQuestion);
router.post("/questions", questionController.ajouterQuestion);
router.put("/questions/:id", questionController.modifierQuestion);
router.delete("/questions/:id", questionController.supprimerQuestion);

// ======================================================
// REPONSES
// ======================================================

router.post("/questions/:id/reponses", questionController.ajouterReponse);
router.put("/reponses/:id", questionController.modifierReponse);
router.delete("/reponses/:id", questionController.supprimerReponse);

// ======================================================
// EVALUATIONS
// ======================================================

router.get("/evaluations", evaluationController.obtenirEvaluations);
router.get("/evaluations/:id", evaluationController.obtenirEvaluationParId);

// ======================================================
// TENTATIVES DES APPRENANTS
// ======================================================

router.get("/tentatives", tentativeQuizController.obtenirTentativesFormateur);

// NOUVEAU : Validation certificat depuis une tentative
// Marche MEME si l'apprenant n'a jamais demande le certificat
// Le backend le cree + le valide / refuse en 1 clic
// body: { decision: "valider" | "refuser" }
router.patch("/tentatives/:id/certificat", tentativeQuizController.validerCertificatTentative);

// Surveillance : valider / invalider une tentative suspecte
// body: { statutSurveillance: "validee" | "invalidee" }
router.patch("/tentatives/:id/surveillance", tentativeQuizController.modifierStatutSurveillance);

// ======================================================
// CERTIFICATS
// ======================================================

router.get("/certificats", certificatController.obtenirCertificats);
router.get("/certificats/:id", certificatController.obtenirCertificat);

// GARDE pour compatibilite avec ton ancien code
router.patch("/certificats/:id", certificatController.modifierStatutCertificat);

// AJOUTE : la vraie route utilisee par certificatController
// et par le frontend apprenant / formateur
// body: { statutCertificat: "validee" | "annulee" }
router.patch("/certificats/:id/statut", certificatController.modifierStatutCertificat);

// ======================================================
// QUIZ FINAL DES FORMATIONS
// ======================================================

router.get("/formations/:numFormation/quiz-final", quizFinalController.obtenirQuizFinal);
router.post("/formations/:numFormation/quiz-final", quizFinalController.ajouterQuizFinal);

module.exports = router;