const express = require("express");
const cors = require("cors");
require("dotenv").config();

const sequelize = require("./config/database");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://gestioncertification-frontend.onrender.com",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = [
  ["authRoutes", "./routes/authRoutes", "/api/auth"],
  ["apprenantRoutes", "./routes/apprenantRoutes", "/api/apprenant"],
  ["utilisateurRoutes", "./routes/utilisateurRoutes", "/api/utilisateur"],
  ["moduleRoutes", "./routes/moduleRoutes", "/api/formateur/modules"],
  ["formateurRoutes", "./routes/formateurRoutes", "/api/formateur"],
  ["formationRoutes", "./routes/formationRoutes", "/api/formateur/formations"]
];

for (const [name, routePath, url] of routes) {
  try {
    const router = require(routePath);

    if (typeof router !== "function") {
      throw new Error(`${name} n'exporte pas un router Express valide.`);
    }

    app.use(url, router);
    console.log(`${name} enregistré sur ${url}`);
  } catch (error) {
    console.error(`Erreur dans ${name} :`, error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Backend GestionFormation fonctionne !"
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route introuvable."
  });
});

app.use((error, req, res, next) => {
  console.error("Erreur serveur :", error);

  res.status(500).json({
    message: "Erreur interne du serveur."
  });
});

const PORT = process.env.PORT || 5000;

const demarrerServeur = async () => {
  try {
    await sequelize.authenticate();

    console.log("Connexion MySQL réussie !");

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erreur de démarrage :", error.message);
    process.exit(1);
  }
};

demarrerServeur();

module.exports = app;