const express = require('express');
const cors = require('cors');
const pawnoteModule = require('pawnote');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet avec support ENT opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    const loginOptions = {
      url,
      username,
      password,
    };

    if (cas && cas !== 'none') {
      loginOptions.cas = cas;
    }

    // Gestion robuste des exports de pawnote (CommonJS / ESM compatibility)
    const pawnote = pawnoteModule.default || pawnoteModule;
    const loginMethod = pawnote.login || (pawnote.PronoteApi && pawnote.PronoteApi.login) || pawnote;

    if (typeof loginMethod !== 'function') {
      console.error('Contenu du module pawnote :', pawnoteModule);
      throw new Error("La fonction login est introuvable dans le module pawnote.");
    }

    // 1. Connexion à Pronote
    const session = await loginMethod(loginOptions);

    // 2. Récupération simultanée des données
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

    // 3. Réponse JSON
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
    console.error('Détail Erreur Pronote :', err);

    res.status(401).json({
      success: false,
      error: err.message || 'Impossible de se connecter à Pronote.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
