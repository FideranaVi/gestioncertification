
const express = require("express");
const router = express.Router();

const tentativeQuizController = require("../controllers/tentativeQuizController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

// ======================================================
// AUTHENTIFICATION
// ======================================================

router.use(authMiddleware);

// ======================================================
// ROUTES APPRENANT
// ======================================================

router.get(
  "/",
  verifierRole("apprenant"),
  tentativeQuizController.obtenirTentatives
);

router.get(
  "/:id",
  verifierRole("apprenant"),
  tentativeQuizController.obtenirTentative
);

router.post(
  "/",
  verifierRole("apprenant"),
  tentativeQuizController.commencerTentative
);

router.patch(
  "/:id/reponses",
  verifierRole("apprenant"),
  tentativeQuizController.enregistrerReponses
);

router.post(
  "/:id/soumettre",
  verifierRole("apprenant"),
  tentativeQuizController.soumettreTentative
);

// ======================================================
// ROUTE FORMATEUR
// ======================================================

router.get(
  "/formateur",
  verifierRole("formateur"),
  tentativeQuizController.obtenirTentativesFormateur
);

module.exports = router;
