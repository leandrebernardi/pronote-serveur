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

// Interception et surcharge de fetch pour simuler un navigateur réel sur toutes les requêtes réseau
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('User-Agent')) {
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
  }
  return originalFetch(url, { ...options, headers });
};

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

    // 1. Normalisation de l'URL racine
    let baseUrl = rawUrl;
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    baseUrl = baseUrl.replace(/\/+$/, '') + '/';

    const cleanUsername = (username || '').trim();

    // 2. Filtrage du CAS (connexion directe si 'none', 'direct' ou non spécifié)
    const rawCas = (cas || '').toString().trim().toLowerCase();
    const casTarget =
      rawCas &&
      rawCas !== 'none' &&
      rawCas !== 'direct' &&
      rawCas !== 'null' &&
      rawCas !== 'undefined'
        ? cas.trim()
        : undefined;

    console.log('--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL racine :', baseUrl);
    console.log('2. Mode de connexion :', casTarget ? `CAS (${casTarget})` : 'Connexion directe Pronote');

    // 3. Initialisation de l'instance directement associée au compte Élève
    console.log('3. Initialisation de l\'instance Pronote (AccountKind.STUDENT)...');
    const session = await createInstance(baseUrl, AccountKind.STUDENT);

    console.log('4. Instance initialisée avec succès.');

    // 4. Authentification par identifiants
    console.log('5. Exécution de loginCredentials...');
    const loginOptions = {
      username: cleanUsername,
      password: password,
    };

    if (casTarget) {
      loginOptions.cas = casTarget;
    }

    const sessionHandle = await loginCredentials(session, loginOptions);

    console.log('6. Connexion réussie ! Récupération des données...');

    // 5. Récupération parallèle des données de l'élève
    const [homeData, gradesData, notebookData] = await Promise.all([
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
      error: err.message || 'Impossible de se connecter à Pronote. Vérifiez vos identifiants.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
