
const express = require("express");
const router = express.Router();

const {
  obtenirUtilisateurs,
  obtenirStatistiquesUtilisateurs,
  obtenirUtilisateur,
  ajouterUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur
} = require("../controllers/utilisateurController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.use(verifierRole("administrateur"));

router.get("/statistiques", obtenirStatistiquesUtilisateurs);
router.get("/", obtenirUtilisateurs);
router.get("/:id", obtenirUtilisateur);
router.post("/", ajouterUtilisateur);
router.put("/:id", modifierUtilisateur);
router.delete("/:id", supprimerUtilisateur);

module.exports = router;
