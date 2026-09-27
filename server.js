import express from 'express';
import cors from 'cors';
import { 
  loginCredentials, 
  instance as createInstance, 
  cleanURL,
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

    console.log('1. Création de l\'instance Pronote...');
    const session = await createInstance(rawUrl);

    // Nettoyage de l'URL pour loginCredentials (pour cibler la racine du serveur Pronote)
    const normalizedUrl = cleanURL(rawUrl);

    console.log('2. Lancement de loginCredentials avec URL racine :', normalizedUrl);
    const sessionHandle = await loginCredentials(session, {
      url: normalizedUrl,
      username: cleanUsername,
      password: password,
      cas: casTarget,
    });

    console.log('Connexion réussie ! Récupération des données...');

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
