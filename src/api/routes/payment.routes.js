const express = require('express');
const { Router } = require('express');
const pool = require('../../config/database');
const { protect } = require('../middlewares/auth.middleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = Router();


/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Créer une intention de paiement Stripe pour un événement payant
 *     description: >
 *       Permet à un utilisateur authentifié de générer une intention de paiement Stripe  
 *       pour un événement payant. Retourne un `clientSecret` à utiliser côté client (frontend).
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       200:
 *         description: Intention de paiement créée avec succès
 *         content:
 *           application/json:
 *             example:
 *               message: "Intention de paiement créée avec succès."
 *               clientSecret: "pi_3Nk...secret_123"
 *       400:
 *         description: Prix invalide ou événement gratuit
 *         content:
 *           application/json:
 *             example:
 *               message: "Montant invalide pour cet événement payant."
 *       404:
 *         description: Événement non trouvé
 *         content:
 *           application/json:
 *             example:
 *               message: "Événement non trouvé."
 *       500:
 *         description: Erreur serveur (Stripe ou DB)
 *         content:
 *           application/json:
 *             example:
 *               message: "Erreur lors de la création de l'intention de paiement."
 */

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Webhook Stripe pour gérer les paiements réussis
 *     description: >
 *       Stripe appelle cette route automatiquement après un paiement réussi.  
 *       Si le paiement est validé, l’utilisateur est inscrit automatiquement à l’événement.
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           example:
 *             id: "evt_1NK...example"
 *             type: "payment_intent.succeeded"
 *             data:
 *               object:
 *                 id: "pi_3Nk...example"
 *                 metadata:
 *                   eventId: "12"
 *                   userId: "34"
 *     responses:
 *       200:
 *         description: Webhook reçu avec succès
 *         content:
 *           application/json:
 *             example:
 *               received: true
 *       400:
 *         description: Erreur de signature Stripe (vérification échouée)
 *         content:
 *           application/json:
 *             example:
 *               message: "Webhook Error: Signature invalid"
 */


/**
 * Créer une intention de paiement pour un événement payant
 * POST /api/payments/create-payment-intent
 */
router.post('/create-payment-intent', protect, async (req, res) => {
  const { eventId } = req.body;
  const { id: userId } = req.user;

  try {
    // Vérifier que l'événement existe
    const eventResult = await pool.query(
      'SELECT nom, prix, est_gratuit FROM evenements WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé." });
    }

    const event = eventResult.rows[0];

    // Vérifier que le prix est correct pour un événement payant
    if (!event.prix || Number(event.prix) <= 0) {
      return res.status(400).json({
        message: "Montant invalide pour cet événement payant."
      });
    }

    // Stripe attend un entier (XOF n'a pas de décimales)
    const amount = Math.round(Number(event.prix));

    // Créer l'intention de paiement Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'xof',
      metadata: { eventId, userId, eventName: event.nom }
    });

    return res.status(200).json({
      message: "Intention de paiement créée avec succès.",
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error("Erreur Stripe:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'intention de paiement." });
  }
});

/**
 * Webhook Stripe pour inscrire l'utilisateur après paiement réussi
 * POST /api/payments/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Quand le paiement est réussi
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const eventId = paymentIntent.metadata.eventId;
    const userId = paymentIntent.metadata.userId;

    try {
      // Vérifier si l'utilisateur est déjà inscrit
      const existing = await pool.query(
        'SELECT * FROM inscriptions WHERE utilisateur_id = $1 AND evenement_id = $2',
        [userId, eventId]
      );

      if (existing.rows.length === 0) {
        // Si pas encore inscrit, ajouter l'inscription
        await pool.query(
          'INSERT INTO inscriptions (utilisateur_id, evenement_id) VALUES ($1, $2)',
          [userId, eventId]
        );
        console.log(`Utilisateur ${userId} inscrit à l'événement ${eventId}`);
      } else {
        console.log(`Utilisateur ${userId} est déjà inscrit à l'événement ${eventId}`);
      }

    } catch (err) {
      console.error('Erreur lors de l\'insertion de l\'inscription :', err);
    }
  }

  res.json({ received: true });
});

module.exports = router;
