const express = require('express');
const cors = require('cors');
const { PronoteApi } = require('pawnote');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet avec support ENT opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  // On récupère aussi la propriété 'cas' (ex: 'eduka', 'ac-paris', 'none', etc.)
  const { url, username, password, cas } = req.body;

  try {
    // Configuration des paramètres de connexion
    const loginOptions = {
      url,
      username,
      password,
    };

    // Si un CAS/ENT particulier comme Eduka est spécifié
    if (cas && cas !== 'none') {
      loginOptions.cas = cas;
    }

    // 1. Connexion à Pronote via l'ENT
    const session = await PronoteApi.login(loginOptions);

    // 2. Récupération simultanée de toutes les données
    const [
      timetable,
      marks,
      homework,
      absences,
      evaluations,
      menu,
      news,
    ] = await Promise.all([
      session.timetable().catch(() => []),
      session.marks().catch(() => null),
      session.homework().catch(() => []),
      session.absences().catch(() => null),
      session.evaluations().catch(() => []),
      session.menu().catch(() => []),
      session.news().catch(() => []),
    ]);

    // 3. Renvoi de la réponse
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
    // Affiche le détail exact de l'erreur dans la console Render
    console.error('Détail Erreur Pronote :', err);

    // Renvoie le vrai message d'erreur à l'application frontend
    res.status(401).json({
      success: false,
      error: err.message || 'Identifiants, URL ou ENT invalides.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
