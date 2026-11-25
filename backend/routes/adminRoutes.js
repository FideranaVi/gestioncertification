const express = require("express");
const router = express.Router();
const { Utilisateur } = require("../models/Utilisateur");
const { authMiddleware, verifierRole } = require("../middlewares/authMiddleware");

// FIX : authMiddleware = verifierToken, verifierRole("admin") = verifierAdmin
router.use(authMiddleware);
router.use(verifierRole("admin"));

router.get("/utilisateurs", async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.findAll({
      order: [["idUtilisateur", "DESC"]],
    });
    return res.json({ utilisateurs });
  } catch (error) {
    console.error("ADMIN UTILISATEURS ERREUR:", error.message);
    return res.status(500).json({ message: "Erreur serveur: " + error.message });
  }
});

router.get("/utilisateurs/:id", async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    return res.json({ utilisateur: user });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur: " + error.message });
  }
});

router.put("/utilisateurs/:id", async (req, res) => {
  try {
    const { role } = req.body;
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    user.role = role;
    await user.save();
    return res.json({ message: "Role mis a jour.", utilisateur: user });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur: " + error.message });
  }
});

router.delete("/utilisateurs/:id", async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    await user.destroy();
    return res.json({ message: "Utilisateur supprime." });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur: " + error.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const total = await Utilisateur.count();
    return res.json({ total });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur: " + error.message });
  }
});

module.exports = router;