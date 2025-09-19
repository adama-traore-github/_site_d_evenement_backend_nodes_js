const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const pool = require('./config/database');
const authRoutes = require('./api/routes/auth.routes');
const eventRoutes = require('./api/routes/event.routes');
const inscriptionRoutes = require('./api/routes/inscription.routes');
const paymentRoutes = require('./api/routes/payment.routes');
const commentRoutes = require('./api/routes/comment.routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('../swagger.config');

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(path.join(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', inscriptionRoutes);
app.use('/api/events', commentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));


app.get('/', (req, res) => {
  res.status(200).json({ message: 'API en marche !' });
});

app.use((err, req, res, next) => {
  console.error("--- ERREUR GLOBALE CAPTURÉE ---");
  console.error(err.stack);
  res.status(500).send({ message: "Une erreur interne est survenue." });
});

module.exports = app;