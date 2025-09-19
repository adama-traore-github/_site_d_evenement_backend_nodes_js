const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('API des Événements', () => {
  let token; 
  let userId;  

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        prenom: 'Test',
        nom: 'User',
        email: `test-${Date.now()}@example.com`, 
        mot_de_passe: 'password123'
      });
    userId = response.body.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: response.body.user.email,
        mot_de_passe: 'password123'
      });
    token = loginResponse.body.token;
  });

  // Ce bloc s'exécute UNE SEULE FOIS après tous les tests
  afterAll(async () => {
    // On nettoie en supprimant l'utilisateur de test
    if (userId) {
      await pool.query('DELETE FROM utilisateurs WHERE id = $1', [userId]);
    }
    pool.end(); // On ferme la connexion à la BDD
  });


  it('GET /api/events - devrait retourner une liste de tous les événements', async () => {
    const response = await request(app).get('/api/events');
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });


  // --- NOUVEAU : TESTS DE LA ROUTE PROTÉGÉE ---
  describe('POST /api/events', () => {
    it('devrait refuser l\'accès sans token JWT (erreur 401)', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({
          nom: "Événement sans token",
          description: "Ceci ne devrait pas marcher.",
          date: "2025-01-01T12:00:00Z"
        });
      
      expect(response.statusCode).toBe(401);
    });

    it('devrait créer un nouvel événement avec un token JWT valide', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`) // <-- On utilise le token ici !
        .send({
          nom: "Mon Super Événement",
          description: "Un événement créé via un test automatisé.",
          date: "2026-01-01T12:00:00Z"
        });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.nom).toBe("Mon Super Événement");
      expect(response.body.organisateur_id).toBe(userId);
    });
  });
});