import express from 'express';
import cors from 'cors';
import { 
  loginCredentials, 
  instance as createInstance, 
  homepage, 
  gradesOverview, 
  notebook 
} from 'pawnote';

// 1. LE PATCH NAVIGATEUR (Essentiel pour passer le pare-feu)
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
  res.send('Serveur Pronote opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // Nettoyage de l'URL racine
    let baseUrl = (url || '').trim();
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
    }
    baseUrl = baseUrl.replace(/\/+$/, '') + '/';

    const rawCas = (cas || '').toString().trim().toLowerCase();
    const casTarget = (rawCas && !['none', 'direct', 'null', 'undefined'].includes(rawCas)) 
      ? cas.trim() 
      : undefined;

    console.log('--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL racine :', baseUrl);
    
    console.log("2. Initialisation de l'instance Pronote...");
    const session = await createInstance(baseUrl);
    console.log('3. Instance initialisée avec succès !');

    // CORRECTION MAJEURE : On recherche dynamiquement l'objet "compte élève" réel 
    // présent sur le serveur (qui contient la fameuse propriété .path attendue par pawnote)
    const eleveAccount = session.accounts?.find(acc => 
      acc.name?.toLowerCase().includes('élève') || 
      acc.name?.toLowerCase().includes('eleve') ||
      acc.kind === 'student'
    );

    if (!eleveAccount) {
        throw new Error("Aucun espace Élève n'a été trouvé sur ce serveur Pronote.");
    }

    console.log('4. Compte sélectionné :', JSON.stringify(eleveAccount));

    // On prépare les options avec l'objet complet
    const loginOptions = {
      url: baseUrl,          // Par sécurité, on redonne l'URL de base ici
      username: username.trim(),
      password: password,
      account: eleveAccount  // L'objet complet qui possède la propriété "path" !
    };

    if (casTarget) {
      loginOptions.cas = casTarget;
    }

    console.log('5. Exécution de loginCredentials...');
    const sessionHandle = await loginCredentials(session, loginOptions);
    
    console.log('6. Connexion réussie ! Récupération des données...');

    // Récupération des données en parallèle
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
