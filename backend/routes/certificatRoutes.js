require("express");
const router = express.Router();

const { authMiddleware } = require("../middlewares/authMiddleware");

const {
  obtenirCertificats,
  obtenirCertificat,
  obtenirCertificatsFormateur,
  genererCertificat,
  modifierStatutCertificat,
  traiterCertificat,
  telechargerCertificatPDF
} = require("../controllers/certificatController");

router.use(authMiddleware);

// GET /certificats - Liste (apprenant = ses certificats, formateur = ses certificats, admin = tous)
router.get("/", obtenirCertificats);

// =====================================================
// AJOUT — NE PAS METTRE APRÈS /:id
// GET /certificats/formateur
// Sinon Express croit que "formateur" = :id
// -> Number("formateur") = NaN -> 400 "Identifiant de certificat invalide."
// C'est exactement ton erreur.
// Frontend formateur appelle : /formateur/certificats/formateur
// =====================================================
router.get("/formateur", obtenirCertificatsFormateur);

// ⚠ IMPORTANT : /:id/pdf AVANT /:id
// Sinon Express peut confondre la route
router.get("/:id/pdf", telechargerCertificatPDF);

// =====================================================
// AJOUT — ALIAS POUR ANCIEN FRONTEND
// PUT /certificats/:id/valider + { decision: "valider" | "refuser" }
// Ne remplace pas PATCH /:id/statut, c'est juste un alias
// Frontend formateur utilise maintenant PATCH /:id/statut,
// mais si un ancien code appelle encore /valider, ça marche aussi.
// =====================================================
router.put("/:id/valider", traiterCertificat);

// GET /certificats/:id - Détail d'un certificat
router.get("/:id", obtenirCertificat);

// POST /certificats - Apprenant demande un certificat
router.post("/", genererCertificat);

// PATCH /certificats/:id/statut - Formateur valide / annule
router.patch("/:id/statut", modifierStatutCertificat);

module.exports = router;