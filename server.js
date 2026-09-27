import express from 'express';
import cors from 'cors';
import { loginCredentials, instance as createInstance, cleanURL, homepage, gradesOverview, notebook } from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    const rawUrl = (url || '').trim();

    // 1. Nettoyage officiel de l'URL via la fonction intégrée pawnote
    const cleanedUrl = cleanURL(rawUrl);
    console.log('URL nettoyée par pawnote :', cleanedUrl);

    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    // 2. Création de l'instance avec l'URL nettoyée
    const instanceObj = await createInstance(cleanedUrl);

    if (casTarget && instanceObj) {
      instanceObj.cas = casTarget;
    }

    const credentials = {
      username: (username || '').trim(),
      password: password,
    };

    console.log('Instance créée. Tentative de connexion pour :', credentials.username);

    // 3. Connexion à Pronote
    const sessionHandle = await loginCredentials(instanceObj, credentials);

    // 4. Récupération simultanée des données
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
