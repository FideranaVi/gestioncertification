const express = require("express");
const router = express.Router();
const { Utilisateur } = require("../models/Utilisateur");
const { verifierToken, verifierAdmin } = require("../middlewares/authMiddleware");

// Toutes les routes admin passent ici
router.use(verifierToken);
router.use(verifierAdmin);

// GET /api/admin/utilisateurs - liste
router.get("/utilisateurs", async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.findAll({
      attributes: ["idUtilisateur", "nom", "prenom", "email", "role", "dateInscription"],
      order: [["dateInscription", "DESC"]],
    });
    return res.json({ utilisateurs });
  } catch (error) {
    console.error("ADMIN UTILISATEURS:", error);
    return res.status(500).json({ message: "Impossible de charger les utilisateurs." });
  }
});

// GET /api/admin/utilisateurs/:id
router.get("/utilisateurs/:id", async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id, {
      attributes: ["idUtilisateur", "nom", "prenom", "email", "role", "dateInscription"],
    });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    return res.json({ utilisateur: user });
  } catch (error) {
    console.error("ADMIN UTILISATEUR ID:", error);
    return res.status(500).json({ message: "Impossible de charger l utilisateur." });
  }
});

// PUT /api/admin/utilisateurs/:id - changer role
router.put("/utilisateurs/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    user.role = role;
    await user.save();
    return res.json({ message: "Role mis a jour.", utilisateur: user });
  } catch (error) {
    console.error("ADMIN UPDATE:", error);
    return res.status(500).json({ message: "Impossible de modifier l utilisateur." });
  }
});

// DELETE /api/admin/utilisateurs/:id
router.delete("/utilisateurs/:id", async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    await user.destroy();
    return res.json({ message: "Utilisateur supprime." });
  } catch (error) {
    console.error("ADMIN DELETE:", error);
    return res.status(500).json({ message: "Impossible de supprimer l utilisateur." });
  }
});

// GET /api/admin/stats - pour le dashboard
router.get("/stats", async (req, res) => {
  try {
    const total = await Utilisateur.count();
    const nbApprenants = await Utilisateur.count({ where: { role: "apprenant" } });
    const nbFormateurs = await Utilisateur.count({ where: { role: "formateur" } });
    return res.json({ total, nbApprenants, nbFormateurs });
  } catch (error) {
    return res.status(500).json({ message: "Impossible de charger les stats." });
  }
});

module.exports = router;