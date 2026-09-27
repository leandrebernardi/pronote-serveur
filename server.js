import express from 'express';
import cors from 'cors';
import { loginCredentials, cleanURL, homepage, gradesOverview, notebook } from 'pawnote';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur Pronote complet opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // 1. Nettoyage de la chaîne d'URL avec cleanURL
    const rawUrl = (url || '').trim();
    const parsedUrl = cleanURL(rawUrl);

    // 2. Création de l'objet instance pour pawnote
    const instance = {
      url: parsedUrl,
      cas: (cas && cas !== 'none') ? cas : undefined,
    };

    const credentials = {
      username: (username || '').trim(),
      password: password,
    };

    console.log('Tentative de connexion à :', parsedUrl.toString());

    // 3. Authentification
    const sessionHandle = await loginCredentials(instance, credentials);

    // 4. Récupération des données
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
