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
    let sessionHandle;

    // Structure des options pour pawnote.loginCredentials
    const options = {
      instance: {
        url: url,
        cas: (cas && cas !== 'none') ? cas : undefined,
      },
      credentials: {
        username: username,
        password: password,
      }
    };

    try {
      // Tentative 1 : Structure complète instance + credentials
      sessionHandle = await loginCredentials(options);
    } catch (e1) {
      console.log('Essai 1 échoué, tentative structure alternative...', e1.message);
      // Tentative 2 : Format à plat avec URL propre
      sessionHandle = await loginCredentials({
        url: url,
        username: username,
        password: password,
        cas: (cas && cas !== 'none') ? cas : undefined,
        device: 'Desktop'
      });
    }

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
