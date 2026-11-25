const express = require("express");
const router = express.Router();
const utilisateurRoutes = require("./utilisateurRoutes");

// On réutilise les mêmes routes que /api/utilisateur, mais sous /api/admin
// Pas besoin de connaître les noms des fonctions du controller
router.use("/", utilisateurRoutes);

module.exports = router;