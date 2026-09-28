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

    // 1. Normalisation stricte de l'URL racine avec slash final
    let baseUrl = rawUrl;
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    baseUrl = baseUrl.replace(/\/+$/, '') + '/';

    const cleanUsername = (username || '').trim();

    // 2. Filtrage du CAS : connexion directe si 'none', 'direct' ou non spécifié
    const rawCas = (cas || '').toString().trim().toLowerCase();
    const casTarget = (rawCas && rawCas !== 'none' && rawCas !== 'direct' && rawCas !== 'null' && rawCas !== 'undefined') 
      ? cas.trim() 
      : undefined;

    console.log('--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL racine :', baseUrl);
    console.log('2. Mode de connexion :', casTarget ? `CAS (${casTarget})` : 'Connexion directe Pronote');

    // 3. Initialisation de l'instance Pronote
    console.log('3. Interrogation de l\'instance Pronote...');
    const session = await createInstance(baseUrl);

    console.log('4. Comptes disponibles :', JSON.stringify(session?.accounts, null, 2));

    // 4. Identification du compte élève
    const studentAccount = session?.accounts?.find(acc => 
      acc.kind === AccountKind.STUDENT || 
      acc.name?.toLowerCase().includes('élève') || 
      acc.name?.toLowerCase().includes('eleve')
    );

    const selectedAccount = studentAccount || AccountKind.STUDENT;
    console.log('5. Compte sélectionné :', studentAccount ? studentAccount.name : 'AccountKind.STUDENT');

    // 5. Structure d'options conforme aux attentes de loginCredentials
    const loginOptions = {
      url: baseUrl, // Propriété requise pour la résolution de l'URL
      username: cleanUsername,
      password: password,
      account: selectedAccount,
    };

    if (casTarget) {
      loginOptions.cas = casTarget;
    }

    console.log('6. Exécution de loginCredentials...');
    const sessionHandle = await loginCredentials(session, loginOptions);

    console.log('7. Connexion réussie ! Récupération des données...');

    // 6. Récupération parallèle des données
    const [
      homeData,
      gradesData,
      notebookData,
    ] = await Promise.all([
      homepage(sessionHandle).catch((err) => {
        console.error('Erreur homepage :', err.message);
        return null;
      }),
      gradesOverview(sessionHandle).catch((err) => {
        console.error('Erreur gradesOverview :', err.message);
        return null;
      }),
      notebook(sessionHandle).catch((err) => {
        console.error('Erreur notebook :', err.message);
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
    console.error('Détail de l\'erreur de connexion Pronote :', err);

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
