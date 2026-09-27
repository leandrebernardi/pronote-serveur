import express from 'express';
import cors from 'cors';
import pawnote from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // 1. Détection de la méthode de connexion
    const loginFn = pawnote?.login || pawnote?.PronoteApi?.login || pawnote?.default?.login || pawnote;

    console.log('Structure du module pawnote :', {
      pawnoteKeys: Object.keys(pawnote || {}),
      loginFnType: typeof loginFn,
    });

    if (typeof loginFn !== 'function') {
      throw new Error(`Export pawnote non reconnu. Types détectés : ${typeof pawnote}`);
    }

    const loginOptions = {
      url,
      username,
      password,
    };

    if (cas && cas !== 'none') {
      loginOptions.cas = cas;
    }

    // 2. Connexion à Pronote
    const session = await loginFn(loginOptions);

    // 3. Récupération des données
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
