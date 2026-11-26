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
  ["adminRoutes", "./routes/adminRoutes", "/api/admin"],
  ["moduleRoutes", "./routes/moduleRoutes", "/api/formateur/modules"],
  ["formateurRoutes", "./routes/formateurRoutes", "/api/formateur"],
  ["formationRoutes", "./routes/formationRoutes", "/api/formateur/formations"],
  ["tentativeQuizRoutes", "./routes/tentativeQuizRoutes", "/api/tentatives"],
  ["certificatRoutesFormateur", "./routes/certificatRoutes", "/api/formateur/certificats"],
  ["certificatRoutes", "./routes/certificatRoutes", "/api/certificats"],
  ["certificatRoutesApprenant", "./routes/certificatRoutes", "/api/apprenant/certificats"],
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
  res.status(200).json({ message: "Backend GestionFormation fonctionne !" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

app.use((error, req, res, next) => {
  console.error("Erreur serveur :", error);
  res.status(500).json({ message: "Erreur interne du serveur.", erreur: error.message });
});

const PORT = process.env.PORT || 5000;

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const demarrerServeur = async () => {
  // Le serveur écoute TOUT DE SUITE, même si la base n'est pas encore prête
  // Comme ça Render voit que c'est Live, et on retry la base en fond
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });

  // Retry MySQL : 15 fois, toutes les 5 secondes = 75 secondes
  // Clever Cloud a le temps de se réveiller
  for (let tentative = 1; tentative <= 15; tentative++) {
    try {
      await sequelize.authenticate();
      console.log(`Connexion MySQL réussie ! (tentative ${tentative})`);
      return;
    } catch (error) {
      console.error(`Tentative MySQL ${tentative}/15 échouée : ${error.message}`);
      if (tentative === 15) {
        console.error("MySQL toujours injoignable après 15 tentatives. Le serveur reste en ligne, il réessaiera à la prochaine requête.");
        // On NE FAIT PAS process.exit(1) -> Render reste Live
        return;
      }
      await attendre(5000);
    }
  }
};

demarrerServeur();

module.exports = app;