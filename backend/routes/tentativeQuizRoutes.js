const express = require("express");
const router = express.Router();

const tentativeQuizController = require("../controllers/tentativeQuizController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);

// ======================================================
// ROUTES FORMATEUR - TOUJOURS AVANT /:id
// ======================================================

router.get(
  "/formateur",
  verifierRole("formateur"),
  tentativeQuizController.obtenirTentativesFormateur
);

router.patch(
  "/:id/certificat",
  verifierRole("formateur"),
  tentativeQuizController.validerCertificatTentative
);

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

router.post(
  "/:id/activite",
  verifierRole("apprenant"),
  tentativeQuizController.enregistrerActivite
);

module.exports = router;