const express = require("express");
const router = express.Router();

const {
  obtenirUtilisateurs,
  obtenirStatistiquesUtilisateurs,
  obtenirUtilisateur,
  ajouterUtilisateur,
  modifierUtilisateur,
  supprimerUtilisateur,
} = require("../controllers/utilisateurController");

const {
  authMiddleware,
  verifierRole,
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);

// Accepte admin ET administrateur, parce que ton token dit "admin"
// mais ton utilisateurRoutes attend "administrateur"
router.use((req, res, next) => {
  const role = (
    req.utilisateur?.role ||
    req.user?.role ||
    req.decoded?.role ||
    req.auth?.role ||
    ""
  ).toLowerCase();

  if (role === "admin" || role === "administrateur") {
    return next();
  }
  // Sinon, essaie le verifierRole officiel
  if (typeof verifierRole === "function") {
    return verifierRole("administrateur")(req, res, next);
  }
  return res.status(403).json({ message: "Accès réservé à l'administrateur." });
});

// IMPORTANT : /statistiques AVANT /:id, sinon "statistiques" est pris pour un id
router.get("/utilisateurs/statistiques", obtenirStatistiquesUtilisateurs);
router.get("/utilisateurs", obtenirUtilisateurs);
router.get("/utilisateurs/:id", obtenirUtilisateur);
router.post("/utilisateurs", ajouterUtilisateur);
router.put("/utilisateurs/:id", modifierUtilisateur);
router.delete("/utilisateurs/:id", supprimerUtilisateur);

module.exports = router;