import express from 'express';
import cors from 'cors';
import { loginCredentials, homepage, gradesOverview, notebook } from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // Inspection et adaptation des arguments de loginCredentials
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    // pawnote.loginCredentials prend en argument (url, username, password, cas)
    // ou un objet d'options. On tente l'appel direct des paramètres :
    let sessionHandle;
    try {
      sessionHandle = await loginCredentials(url, username, password, casTarget);
    } catch (firstAttemptErr) {
      // Si la signature attend un objet unique :
      sessionHandle = await loginCredentials({ url, username, password, cas: casTarget });
    }

    // Récupération des données via les fonctions de la session
    const [
      homeData,
      gradesData,
      notebookData,
    ] = await Promise.all([
      homepage(sessionHandle).catch(() => null),
      gradesOverview(sessionHandle).catch(() => null),
      notebook(sessionHandle).catch(() => null),
    ]);

    res.json({
      success: true,
      user: {
        name: homeData?.user?.name || 'Élève',
        className: homeData?.user?.studentClass?.name || '',
        avatar: homeData?.user?.avatar || null,
      },
      data: {
        homepage: homeData,
        grades: gradesData,
        notebook: notebookData,
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
