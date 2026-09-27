import express from 'express';
import cors from 'cors';
import { loginCredentials, instance as createInstance, homepage, gradesOverview, notebook } from 'pawnote';

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

    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    // 1. Instanciation de l'instance Pawnote
    let instanceObj;
    try {
      // Premier essai : passage direct de l'URL à instance()
      instanceObj = await createInstance(rawUrl);
    } catch (e1) {
      console.log('Essai instance(url) échoué, tentative alternative...', e1.message);
      // Deuxième essai : objet de configuration
      instanceObj = await createInstance({ url: rawUrl, cas: casTarget });
    }

    // Si un CAS est spécifié, on l'attache à l'instance
    if (casTarget && instanceObj) {
      instanceObj.cas = casTarget;
    }

    const credentials = {
      username: (username || '').trim(),
      password: password,
    };

    console.log('Instance Pawnote prête. Lancement de loginCredentials...');

    // 2. Authentification
    const sessionHandle = await loginCredentials(instanceObj, credentials);

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
