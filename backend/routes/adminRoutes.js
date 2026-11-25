const express = require("express");
const router = express.Router();

// 1. Token depuis authMiddleware
const { verifierToken } = require("../middlewares/authMiddleware");

// 2. Role depuis roleMiddlewares (avec S)
let verifierRole;
try {
  ({ verifierRole } = require("../middlewares/roleMiddlewares"));
} catch {
  // Fallback si le fichier s'appelle roleMiddleware sans S sur Render
  ({ verifierRole } = require("../middlewares/roleMiddleware"));
}

// Si verifierRole n'existe pas, on fait un check admin simple
const checkAdmin = verifierRole
  ? verifierRole("admin")
  : (req, res, next) => {
      if (req.utilisateur?.role === "admin" || req.user?.role === "admin" || req.decoded?.role === "admin") {
        return next();
      }
      return res.status(403).json({ message: "Accès réservé à l'administrateur." });
    };

const utilisateurController = require("../controllers/utilisateurController");

router.use(verifierToken, checkAdmin);

router.get("/utilisateurs", utilisateurController.listerUtilisateurs || utilisateurController.getAllUtilisateurs || utilisateurController.getUtilisateurs);
router.post("/utilisateurs", utilisateurController.creerUtilisateur || utilisateurController.createUtilisateur);
router.get("/utilisateurs/:id", utilisateurController.getUtilisateurById || utilisateurController.getUtilisateur);
router.put("/utilisateurs/:id", utilisateurController.modifierUtilisateur || utilisateurController.updateUtilisateur);
router.delete("/utilisateurs/:id", utilisateurController.supprimerUtilisateur || utilisateurController.deleteUtilisateur);

module.exports = router;