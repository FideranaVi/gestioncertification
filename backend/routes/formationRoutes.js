
const express = require("express");
const router = express.Router();

const formationController = require("../controllers/formationController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.use(verifierRole("formateur"));

router.get("/statistiques", formationController.obtenirStatistiquesFormations);
router.get("/", formationController.obtenirFormations);
router.get("/:id", formationController.obtenirFormation);
router.post("/", formationController.ajouterFormation);
router.put("/:id", formationController.modifierFormation);
router.delete("/:id", formationController.supprimerFormation);

module.exports = router;
