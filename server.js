const express = require('express');
const cors = require('cors');
const pronote = require('pronote-api');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Serveur API Pronote opérationnel 🚀');
});

app.post('/api/data', async (req, res) => {
  const { url, username, password, cas } = req.body;

  try {
    let baseUrl = (url || '').trim();
    if (baseUrl.includes('.html')) {
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
    } else if (!baseUrl.endsWith('/')) {
      baseUrl += '/';
    }
    
    console.log('\n--- DÉBUT TENTATIVE DE CONNEXION (pronote-api) ---');
    console.log("URL ciblée :", baseUrl);

    // Connexion via pronote-api
    const session = await pronote.login(baseUrl, username, password, cas || 'none');
    
    console.log(`Connecté avec succès en tant que : ${session.user?.name || 'Élève'}`);

    const marks = await session.marks();
    const timetable = await session.timetable();

    res.json({
      success: true,
      user: {
        name: session.user?.name || 'Élève',
        className: session.user?.studentClass?.name || '',
      },
      data: {
        grades: marks,
        timetable: timetable,
      },
    });

  } catch (err) {
    console.error('Erreur Pronote :', err.message);
    
    if (err.code === 'ERR_BAD_CREDENTIALS') {
      return res.status(401).json({ 
        success: false, 
        error: 'Identifiants incorrects.' 
      });
    }
    
    res.status(500).json({
      success: false,
      error: err.message || 'Impossible de se connecter à Pronote.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur prêt sur le port ${PORT}`);
});
