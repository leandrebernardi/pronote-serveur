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
    const rawUrl = (url || '').trim();
    const cleanUsername = (username || '').trim();
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    console.log('1. Création de l\'instance Pronote...');
    const session = await createInstance(rawUrl);

    // Extraction de la racine pure (ex: https://5010004g.index-education.net/pronote)
    const baseUrl = cleanURL(rawUrl);

    // Recherche de l'espace élève dans les comptes détectés
    const studentAccount = session?.accounts?.find(a => 
      a.name?.toLowerCase().includes('élève') || 
      a.path?.includes('eleve')
    );

    // Utilisation du chemin identifié (ex: mobile.eleve.html ou eleve.html)
    const accountKind = studentAccount ? studentAccount.path : 'mobile.eleve.html';

    console.log('URL racine :', baseUrl);
    console.log('Espace identifié :', accountKind);

    console.log('2. Lancement de loginCredentials...');
    const sessionHandle = await loginCredentials(session, {
      url: baseUrl,
      username: cleanUsername,
      password: password,
      cas: casTarget,
      kind: accountKind,
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
