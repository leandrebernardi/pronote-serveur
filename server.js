import express from 'express';
import cors from 'cors';
import * as pawnoteModule from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

// Détermination dynamique de l'objet PronoteApi / login
const pawnote = pawnoteModule.default || pawnoteModule;
const PronoteApi = pawnote.PronoteApi || pawnote;

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
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

    // Connexion
    const loginFn = PronoteApi.login || pawnote.login || PronoteApi;
    if (typeof loginFn !== 'function') {
      throw new Error("Impossible d'initialiser la fonction de connexion Pawnote.");
    }

    const session = await loginFn(loginOptions);

    // Récupération simultanée des données
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
