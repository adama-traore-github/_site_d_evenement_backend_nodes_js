const express = require('express');
const dotenv = require('dotenv');
const pool = require('./config/database');
const authRoutes = require('./api/routes/auth.routes');
const eventRoutes = require('./api/routes/event.routes'); 
const path = require('path');
const inscriptionRoutes = require('./api/routes/inscription.routes'); 
const paymentRoutes = require('./api/routes/payment.routes'); 




dotenv.config();
const app = express();
const port = parseInt(process.env.PORT || '8000');

// Middlewares
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/api/events', inscriptionRoutes);
app.use('/api/payments', paymentRoutes);



app.get('/', (req, res) => {
  res.status(200).json({ message: 'API en marche !' });
});

app.use((err, req, res, next) => {
  console.error("--- ERREUR GLOBALE CAPTURÉE ---");
  console.error(err.stack);
  res.status(500).send({ message: "Une erreur interne est survenue." });
});

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