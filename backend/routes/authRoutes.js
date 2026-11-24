const express = require("express");
const router = express.Router();

const {
  inscription,
  connexion,
  connexionGoogle // AJOUT SEULEMENT
} = require("../controllers/authController");

router.post("/inscription", inscription);
router.post("/connexion", connexion);
router.post("/google", connexionGoogle); // AJOUT SEULEMENT

module.exports = router;