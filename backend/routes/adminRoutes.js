const express = require("express");
const router = express.Router();
const { verifierToken, verifierRole } = require("../middleware/authMiddleware");
const utilisateurController = require("../controllers/utilisateurController");

router.use(verifierToken, verifierRole("admin"));

router.get("/utilisateurs", utilisateurController.listerUtilisateurs || utilisateurController.getAllUtilisateurs || utilisateurController.getUtilisateurs);
router.post("/utilisateurs", utilisateurController.creerUtilisateur || utilisateurController.createUtilisateur);
router.get("/utilisateurs/:id", utilisateurController.getUtilisateurById || utilisateurController.getUtilisateur);
router.put("/utilisateurs/:id", utilisateurController.modifierUtilisateur || utilisateurController.updateUtilisateur);
router.delete("/utilisateurs/:id", utilisateurController.supprimerUtilisateur || utilisateurController.deleteUtilisateur);

module.exports = router;