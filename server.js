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
    const rawUrl = (url || '').trim();

    // 1. Obtenir une chaîne de caractères propre et sécurisée
    let targetUrl;
    try {
      const cleaned = cleanURL(rawUrl);
      // Si cleanURL renvoie un objet URL, on le convertit en string (href)
      targetUrl = typeof cleaned === 'string' ? cleaned : cleaned.href;
    } catch (e) {
      // Fallback si cleanURL échoue sur le format initial
      targetUrl = rawUrl;
    }

    console.log('URL finale transmise à pawnote :', targetUrl);

    // 2. Préparation de la structure instance
    const instance = {
      url: targetUrl,
      cas: (cas && cas !== 'none') ? cas : undefined,
    };

    const credentials = {
      username: (username || '').trim(),
      password: password,
    };

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
