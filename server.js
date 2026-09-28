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

    // 2. Filtrage du CAS (connexion directe si 'none', 'direct' ou vide)
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

    // 5. Structure des options de connexion
    const loginOptions = {
      url: baseUrl,
      username: cleanUsername,
      password: password,
      account: selectedAccount,
    };

    if (casTarget) {
      loginOptions.cas = casTarget;
    }

    console.log('6. Exécution de loginCredentials...');
    let sessionHandle;

    try {
      sessionHandle = await loginCredentials(session, loginOptions);
    } catch (loginErr) {
      // Diagnostic réseau automatique si la page mobile est indisponible
      if (loginErr.name === 'PageUnavailableError' || loginErr.message?.includes('does not exist')) {
        console.error('❌ PageUnavailableError détectée. Analyse HTTP de la page mobile...');
        const targetUrl = new URL(studentAccount?.path || 'mobile.eleve.html', baseUrl).toString();

        try {
          const diagRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const pageText = await diagRes.text();

          console.log(`[Diagnostic] Code de réponse HTTP : ${diagRes.status}`);

          if (pageText.includes('ENT') || pageText.includes('EduConnect') || pageText.includes('authentification')) {
            console.log('[Diagnostic] ⚠️ L\'établissement impose une connexion via un ENT/CAS !');
          } else if (diagRes.status === 403 || diagRes.status === 429) {
            console.log('[Diagnostic] ⚠️ L\'adresse IP du serveur Render est filtrée ou bloquée par Index-Éducation.');
          } else {
            console.log('[Diagnostic] Extrait HTML reçu :', pageText.substring(0, 250).replace(/\s+/g, ' '));
          }
        } catch (diagErr) {
          console.error('[Diagnostic] Erreur lors du test HTTP :', diagErr.message);
        }
      }
      throw loginErr; // Relancer l'erreur d'origine
    }

    console.log('7. Connexion réussie ! Récupération des données...');

    // 6. Récupération parallèle des données
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
      error: err.message || 'Impossible de se connecter à Pronote.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
