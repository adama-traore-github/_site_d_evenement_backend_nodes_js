const app = require('./src/app'); // On importe notre application configurée
const pool = require('./src/config/database');

const port = parseInt(process.env.PORT || '8000');

// Démarrage du serveur
const startServer = async () => {
  try {
    await pool.connect();
    console.log('✅ Connexion à la base de données réussie.');
    app.listen(port, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Echec de la connexion à la base de données:', error);
    process.exit(1);
  }
};

startServer();