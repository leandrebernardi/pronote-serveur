import express from 'express';
import cors from 'cors';
import { 
  loginCredentials, 
  instance as createInstance, 
  AccountKind,
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

    // S'assurer d'avoir la racine de l'URL pour pawnote
    if (!rawUrl.includes('/eleve.html')) {
      rawUrl = rawUrl.replace(/\/+$/, '') + '/eleve.html';
    }

    const cleanUsername = (username || '').trim();
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    console.log('1. Création de l\'instance Pronote avec :', rawUrl);
    const session = await createInstance(rawUrl);

    console.log('2. Lancement de loginCredentials avec AccountKind.STUDENT (6)...');
    const sessionHandle = await loginCredentials(session, {
      url: rawUrl,
      username: cleanUsername,
      password: password,
      cas: casTarget,
      kind: AccountKind.STUDENT, // Utilisation de la constante officielle de pawnote
    });

    console.log('Connexion réussie ! Récupération des données...');

    // 3. Récupération des données
    const [
      homeData,
      gradesData,
      notebookData,
    ] = await Promise.all([
      homepage(sessionHandle).catch((err) => {
        console.error('Erreur homepage :', err);
        return null;
      }),
      gradesOverview(sessionHandle).catch((err) => {
        console.error('Erreur gradesOverview :', err);
        return null;
      }),
      notebook(sessionHandle).catch((err) => {
        console.error('Erreur notebook :', err);
        return null;
      }),
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
