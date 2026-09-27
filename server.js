import express from 'express';
import cors from 'cors';
import { 
  loginCredentials, 
  instance as createInstance, 
  homepage, 
  gradesOverview, 
  notebook 
} from 'pawnote';

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

    if (!rawUrl.includes('/eleve.html')) {
      rawUrl = rawUrl.replace(/\/+$/, '') + '/eleve.html';
    }

    const casTarget = (cas && cas !== 'none') ? cas : undefined;
    const cleanUsername = (username || '').trim();

    console.log('Signature loginCredentials :', loginCredentials.toString());

    let sessionHandle = null;

    // Tentative 1 : loginCredentials(rawUrl, { username, password, cas })
    try {
      console.log('Test Signature 1 : (urlStr, credentials)');
      sessionHandle = await loginCredentials(rawUrl, {
        username: cleanUsername,
        password: password,
        cas: casTarget,
      });
    } catch (e1) {
      console.log('Échec Signature 1 :', e1.message);

      // Tentative 2 : loginCredentials({ url: rawUrl, username, password, cas })
      try {
        console.log('Test Signature 2 : ({ url, username, password, cas })');
        sessionHandle = await loginCredentials({
          url: rawUrl,
          username: cleanUsername,
          password: password,
          cas: casTarget,
        });
      } catch (e2) {
        console.log('Échec Signature 2 :', e2.message);

        // Tentative 3 : loginCredentials(instanceData, { username, password }) avec structure pawnote
        console.log('Test Signature 3 : (instanceObjectWithCleanURL)');
        const instanceData = await createInstance(rawUrl);
        sessionHandle = await loginCredentials(
          { ...instanceData, server: rawUrl, root: rawUrl }, 
          { username: cleanUsername, password: password, cas: casTarget }
        );
      }
    }

    console.log('Authentification réussie ! Récupération des données...');

    // Récupération des données
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
    console.error('Détail Erreur Finale Pronote :', err);

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
