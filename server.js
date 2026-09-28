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

    // 1. Nettoyage et formatage strict de l'URL racine
    let baseUrl = rawUrl;
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    baseUrl = baseUrl.replace(/\/+$/, '') + '/';

    const cleanUsername = (username || '').trim();
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    console.log('--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL racine :', baseUrl);
    console.log('2. CAS demandé :', casTarget || 'Aucun (Connexion directe)');

    console.log('3. Interrogation de l\'instance Pronote...');
    const session = await createInstance(baseUrl);

    // Analyse des comptes pris en charge par l'établissement
    console.log('4. Comptes détectés sur ce serveur :', JSON.stringify(session?.accounts, null, 2));

    // Sélection automatique du compte élève fourni par l'instance
    const studentAccount = session?.accounts?.find(acc => 
      acc.kind === AccountKind.STUDENT || 
      acc.name?.toLowerCase().includes('élève') || 
      acc.name?.toLowerCase().includes('eleve')
    );

    const selectedKind = studentAccount || AccountKind.STUDENT;
    console.log('5. Configuration du compte retenu :', selectedKind);

    console.log('6. Lancement de loginCredentials...');
    const sessionHandle = await loginCredentials(session, {
      url: baseUrl,
      username: cleanUsername,
      password: password,
      cas: casTarget,
      kind: selectedKind,
    });

    console.log('Connexion réussie ! Récupération des données...');

    // 7. Récupération des données
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
