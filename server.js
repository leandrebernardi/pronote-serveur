const express = require('express');
const cors = require('cors');
const { PronoteApi } = require('pawnote');

const app = express();

app.use(cors());
app.use(express.json());

// Route de test pour vérifier que le serveur répond
app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

// Route principale pour tout récupérer en un seul appel
app.post('/api/data', async (req, res) => {
  const { url, username, password } = req.body;

  try {
    // 1. Connexion à la session Pronote
    const session = await PronoteApi.login({
      url,
      username,
      password,
    });

    // 2. Récupération simultanée de toutes les sections de données
    const [
      timetable,
      marks,
      homework,
      absences,
      evaluations,
      menu,
      news,
    ] = await Promise.all([
      session.timetable().catch(() => []),   // Emploi du temps
      session.marks().catch(() => null),       // Notes et moyennes
      session.homework().catch(() => []),    // Devoirs à faire
      session.absences().catch(() => null),    // Retards et absences
      session.evaluations().catch(() => []), // Compétences / Évaluations
      session.menu().catch(() => []),        // Repas du jour / Cantine
      session.news().catch(() => []),        // Information & Actualités
    ]);

    // 3. Renvoi de l'ensemble des données à l'application React Native
    res.json({
      success: true,
      user: {
        name: session.user?.name || 'Élève',
        className: session.user?.studentClass?.name || '',
        avatar: session.user?.avatar || null,
      },
      data: {
        timetable,
        marks,
        homework,
        absences,
        evaluations,
        menu,
        news,
      },
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des données Pronote :', err);
    res.status(401).json({
      success: false,
      error: 'Impossible de récupérer les données. Vérifiez vos identifiants ou l\'URL.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});