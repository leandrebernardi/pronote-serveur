import express from 'express';
import cors from 'cors';
import * as pawnote from 'pawnote';

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
    const cleanUsername = (username || '').trim();
    const casTarget = (cas && cas !== 'none') ? cas : undefined;

    console.log('--- DIAGNOSTIC PAWNOTE ---');
    console.log('Exports pawnote disponibles :', Object.keys(pawnote));

    console.log('1. Création de l\'instance Pronote...');
    const session = await pawnote.instance(rawUrl);
    console.log('Session instance créée :', JSON.stringify(session, null, 2));

    // Si des comptes sont détectés
    if (session?.accounts && session.accounts.length > 0) {
      console.log('Comptes détectés dans l\'instance :', session.accounts);
    }

    // Essai avec l'account complet si disponible, ou tentative de login
    const accountChoice = session?.accounts?.[0] || 'eleve.html';
    console.log('Option de compte sélectionnée :', accountChoice);

    console.log('2. Lancement de loginCredentials...');
    const sessionHandle = await pawnote.loginCredentials(session, {
      url: rawUrl,
      username: cleanUsername,
      password: password,
      cas: casTarget,
      kind: accountChoice.kind || accountChoice.path || accountChoice
    });

    console.log('Connexion réussie ! Récupération des données...');

    const [
      homeData,
      gradesData,
      notebookData,
    ] = await Promise.all([
      pawnote.homepage(sessionHandle).catch(() => null),
      pawnote.gradesOverview(sessionHandle).catch(() => null),
      pawnote.notebook(sessionHandle).catch(() => null),
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
