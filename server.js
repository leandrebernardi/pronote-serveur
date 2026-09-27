import express from 'express';
import cors from 'cors';
import * as pawnote from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // pawnote exporte ses fonctions sous forme d'objets nommés
    const loginFn = pawnote.login || (pawnote.PronoteApi && pawnote.PronoteApi.login);

    if (typeof loginFn !== 'function') {
      console.log('Exports disponibles dans pawnote :', Object.keys(pawnote));
      throw new Error(`Méthode login introuvable. Exports disponibles : ${Object.keys(pawnote).join(', ')}`);
    }

    const loginOptions = {
      url,
      username,
      password,
    };

    if (cas && cas !== 'none') {
      loginOptions.cas = cas;
    }

    // 1. Connexion à Pronote
    const session = await loginFn(loginOptions);

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
