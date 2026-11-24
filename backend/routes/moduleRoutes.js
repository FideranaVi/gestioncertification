
const express = require("express");
const router = express.Router();

const moduleController = require("../controllers/moduleController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.use(verifierRole("formateur"));

router.get("/statistiques", moduleController.obtenirStatistiquesModules);

router.get("/", moduleController.obtenirModules);
router.get("/:id", moduleController.obtenirModule);

router.post("/", moduleController.ajouterModule);
router.put("/:id", moduleController.modifierModule);
router.delete("/:id", moduleController.supprimerModule);

module.exports = router;
