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
    const rawUrl = (url || '').trim();

    // 1. EXTRACTION STRICTE DE LA RACINE PRONOTE
    // Coupe tout ce qui se trouve après le dernier slash si on a un .html
    let baseUrl = rawUrl;
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    // Supprime les éventuels slashs finaux
    baseUrl = baseUrl.replace(/\/+$/, '');

    const cleanUsername = (username || '').trim();
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    console.log('1. URL formatée pour pawnote :', baseUrl);

    console.log('2. Création de l\'instance Pronote...');
    const session = await createInstance(baseUrl);

    console.log('3. Lancement de loginCredentials sur :', baseUrl);
    const sessionHandle = await loginCredentials(session, {
      url: baseUrl, // URL propre (ex: https://.../pronote)
      username: cleanUsername,
      password: password,
      cas: casTarget,
      kind: AccountKind.STUDENT, // Laisse pawnote utiliser automatiquement mobile.eleve.html
    });

    console.log('Connexion réussie ! Récupération des données...');

    // 4. Récupération des données
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
