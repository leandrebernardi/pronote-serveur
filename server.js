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
    let rawUrl = (url || '').trim();

    // S'assurer que l'URL se termine bien par /eleve.html
    if (rawUrl.endsWith('/pronote')) {
      rawUrl = `${rawUrl}/eleve.html`;
    } else if (rawUrl.endsWith('/pronote/')) {
      rawUrl = `${rawUrl}eleve.html`;
    } else if (!rawUrl.endsWith('/eleve.html')) {
      rawUrl = rawUrl.replace(/\/+$/, '') + '/eleve.html';
    }

    console.log('URL stricte transmise à pawnote :', rawUrl);

    // 1. Préparation de la structure d'instance sans passer par cleanURL
    const instance = {
      url: rawUrl,
      cas: (cas && cas !== 'none') ? cas : undefined,
    };

    const credentials = {
      username: (username || '').trim(),
      password: password,
    };

    // 2. Authentification
    const sessionHandle = await loginCredentials(instance, credentials);

    // 3. Récupération des données
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
