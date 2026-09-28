import express from 'express';
import cors from 'cors';
import * as pronote from 'pawnote';

// 1. PATCH NAVIGATEUR (Anti-Bot / WAF Bypass)
// Très important pour les serveurs cloud comme Render
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (url, options = {}) {
  const headers = new Headers(options.headers || {});
  
  // Simulation d'un vrai navigateur pour éviter le blocage par le pare-feu d'Index-Education
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  }
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
  headers.set('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
  headers.set('Sec-Fetch-Dest', 'document');
  headers.set('Sec-Fetch-Mode', 'navigate');
  
  return originalFetch(url, { ...options, headers });
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur API Pawnote (Version Finale Forcée) opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // 2. LA CORRECTION DÉCISIVE : Manipulation de l'URL
    let baseUrl = (url || '').trim();
    
    // Si l'URL contient déjà un fichier .html, on l'isole pour repartir du dossier racine
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    // On IMPOSE eleve.html (la version bureau) pour éviter que pawnote ne crash sur mobile.eleve.html
    const targetUrl = baseUrl + 'eleve.html';

    console.log('\n--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL ciblée (Forcée) :', targetUrl);
    
    console.log("2. Création de la session (createSessionHandle)...");
    const session = pronote.createSessionHandle();

    // 3. Application scrupuleuse de ton exemple de code
    const loginOptions = {
      url: targetUrl, 
      kind: pronote.AccountKind.STUDENT,
      username: username.trim(),
      password: password
    };

    if (cas && !['none', 'direct', 'null', 'undefined'].includes(cas.toString().toLowerCase())) {
      loginOptions.cas = cas.trim();
    }

    console.log('3. Exécution de loginCredentials...');
    await pronote.loginCredentials(session, loginOptions);
    
    console.log(`4. Connecté avec succès en tant que : ${session.user?.name || 'Élève'}`);

    // 4. Récupération des données
    console.log('5. Récupération des notes et de l\'emploi du temps...');
    const gradesData = await pronote.getGrades(session).catch(e => {
        console.warn("Erreur lors de la récupération des notes :", e.message);
        return null;
    });

    const today = new Date();
    const timetableData = await pronote.getTimetable(session, today, today).catch(e => {
        console.warn("Erreur lors de la récupération de l'emploi du temps :", e.message);
        return [];
    });

    // 5. Réponse envoyée à ton frontend React
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
