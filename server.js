import express from 'express';
import cors from 'cors';
import * as pronote from 'pawnote';

// 1. LE PATCH NAVIGATEUR (Indispensable sur Render pour éviter le blocage de l'IP)
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
  res.send('Serveur API Pawnote (Nouvelle Version) opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // 2. Nettoyage de l'URL racine
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
    
    // 3. NOUVELLE MÉTHODE : Création du handle de session vide (selon ton exemple)
    console.log("2. Création de la session (createSessionHandle)...");
    const session = pronote.createSessionHandle();

    // 4. Configuration stricte calquée sur la documentation
    const loginOptions = {
      url: baseUrl,
      kind: pronote.AccountKind.STUDENT,
      username: username.trim(),
      password: password
    };

    if (casTarget) {
      loginOptions.cas = casTarget;
    }

    console.log('3. Exécution de loginCredentials...');
    await pronote.loginCredentials(session, loginOptions);
    
    console.log(`4. Connecté avec succès en tant que : ${session.user?.name || 'Élève'}`);

    // 5. Récupération des données avec les nouvelles fonctions de la librairie
    console.log('5. Récupération des notes et de l\'emploi du temps...');
    
    const gradesData = await pronote.getGrades(session).catch(e => {
        console.warn("Erreur notes :", e.message);
        return null;
    });

    // Emploi du temps du jour
    const today = new Date();
    const timetableData = await pronote.getTimetable(session, today, today).catch(e => {
        console.warn("Erreur emploi du temps :", e.message);
        return [];
    });

    // 6. Renvoi de la réponse au front-end (React)
    res.json({
      success: true,
      user: {
        name: session.user?.name || 'Élève',
        className: session.user?.studentClass?.name || '',
      },
      data: {
        grades: gradesData,
        timetable: timetableData,
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
