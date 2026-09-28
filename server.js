import express from 'express';
import cors from 'cors';
import * as pronote from 'pawnote';

// 1. PATCH NAVIGATEUR MINIMAL (Contournement WAF)
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (url, options = {}) {
  const headers = new Headers(options.headers || {});
  
  // Nous injectons uniquement le User-Agent pour simuler un navigateur standard.
  // CRITIQUE : Ne pas forcer 'Accept' ou 'Content-Type' pour ne pas corrompre les requêtes JSON de pawnote.
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  }
  
  return originalFetch(url, { ...options, headers });
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur API Pawnote opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // Nettoyage de l'URL : on garantit le chemin racine
    let baseUrl = (url || '').trim();
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    console.log('\n--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log("URL ciblée :", baseUrl);
    
    const session = pronote.createSessionHandle();
    
    const loginOptions = {
      url: baseUrl,
      kind: pronote.AccountKind.STUDENT,
      username: username.trim(),
      password: password
    };

    if (cas && !['none', 'direct', 'null', 'undefined'].includes(cas.toString().toLowerCase())) {
      loginOptions.cas = cas.trim();
    }

    await pronote.loginCredentials(session, loginOptions);
    console.log(`Connecté avec succès en tant que : ${session.user?.name || 'Élève'}`);

    const gradesData = await pronote.getGrades(session).catch(() => null);
    
    const today = new Date();
    const timetableData = await pronote.getTimetable(session, today, today).catch(() => []);

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
    console.error('Erreur Pronote :', err);
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
