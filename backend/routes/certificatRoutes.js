const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");

const {
  obtenirCertificats,
  obtenirCertificat,
  genererCertificat,
  modifierStatutCertificat,
  telechargerCertificatPDF
} = require("../controllers/certificatController");

router.use(authMiddleware);

// GET /certificats - Liste (apprenant = ses certificats, formateur = ses certificats, admin = tous)
router.get("/", obtenirCertificats);

// ⚠️ IMPORTANT : /:id/pdf AVANT /:id
// Sinon Express peut confondre la route
router.get("/:id/pdf", telechargerCertificatPDF);

// GET /certificats/:id - Détail d'un certificat
router.get("/:id", obtenirCertificat);

// POST /certificats - Apprenant demande un certificat
router.post("/", genererCertificat);

// PATCH /certificats/:id/statut - Formateur valide / annule
router.patch("/:id/statut", modifierStatutCertificat);

module.exports = router;