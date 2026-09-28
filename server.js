import express from 'express';
import cors from 'cors';
import * as pronote from 'pawnote';

// 1. PATCH NAVIGATEUR & INTERCEPTEUR RÉSEAU (SNIFFER)
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (url, options = {}) {
  const headers = new Headers(options.headers || {});
  
  // Simulation d'un navigateur très standard pour maximiser nos chances
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
  headers.set('Accept-Language', 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7');
  headers.set('Connection', 'keep-alive');
  
  console.log(`\n[RÉSEAU] -> Envoi de la requête vers : ${url}`);
  
  // On exécute la requête avec nos faux en-têtes
  const response = await originalFetch(url, { ...options, headers });
  
  console.log(`[RÉSEAU] <- Réponse reçue : Statut HTTP ${response.status} (${response.statusText})`);
  
  // 🔍 LE MOUCHARD : Si c'est une requête vers une page HTML, on lit le contenu pour voir ce que le serveur nous dit vraiment
  if (url.toString().includes('.html') || url.toString().endsWith('/pronote/')) {
      try {
          const clonedResponse = response.clone(); // On clone pour ne pas vider la réponse originale destinée à Pawnote
          const text = await clonedResponse.text();
          console.log(`[INSPECTION HTML] Voici ce que le serveur a répondu (200 premiers caractères) :`);
          console.log(`--------------------------------------------------`);
          console.log(text.substring(0, 200).replace(/\n/g, ' '));
          console.log(`--------------------------------------------------`);
      } catch (e) {
          console.log(`[INSPECTION HTML] Impossible de lire le texte : ${e.message}`);
      }
  }
  
  return response;
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur API Pawnote (Mode Débogage Réseau) opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    // Nettoyage strict de l'URL pour Pawnote
    let baseUrl = (url || '').trim();
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }

    console.log('\n--- DÉBUT TENTATIVE DE CONNEXION ---');
    console.log('1. URL de base envoyée à Pawnote :', baseUrl);
    
    console.log("2. Création de la session (createSessionHandle)...");
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

    console.log('3. Exécution de loginCredentials...');
    await pronote.loginCredentials(session, loginOptions);
    
    console.log(`4. Connecté avec succès en tant que : ${session.user?.name || 'Élève'}`);

    // Récupération des données
    const gradesData = await pronote.getGrades(session).catch(() => null);
    const today = new Date();
    const timetableData = await pronote.getTimetable(session, today, today).catch(() => []);

    res.json({
      success: true,
      user: {
        name: session.user?.name || 'Élève',
        className: session.user?.studentClass?.name || '',
      },
      data: { grades: gradesData, timetable: timetableData },
    });

  } catch (err) {
    console.error('\n❌ Détail de l\'erreur de connexion Pronote :', err);

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
