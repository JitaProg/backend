// QUÈ FA: arrenca el servidor Express i munta tota l'API.
// AMB QUÈ CONNECTA:
//   - .env: configuració (PORT, MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET...).
//   - config/db.js: connexió a MongoDB.
//   - routes: productes, categories i usuaris (login, refresh i logout).
//   - errorHandler: resposta comuna per a qualsevol error.
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

// Cal poder signar els dos tipus de token. El més simple és definir JWT_SECRET;
// també es pot fer servir JWT_ACCESS_SECRET + JWT_REFRESH_SECRET per separar-los.
const hasAccessSecret = Boolean(process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
const hasRefreshSecret = Boolean(process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
if (!hasAccessSecret || !hasRefreshSecret) {
    console.error('Falta JWT_SECRET (o JWT_ACCESS_SECRET + JWT_REFRESH_SECRET) al fitxer .env');
    process.exit(1);
}

const app = express();
app.use(express.json()); // Permet llegir req.body en format JSON.

connectDB(); // Connecta amb MongoDB abans d'atendre peticions.

app.get('/', (req, res) => res.send('API AgroBotiga en marxa'));

// Muntar rutes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes); // Registre, login, refresh, logout, /me i CRUD d'usuaris.
app.use(errorHandler); // Sempre ha d'anar al final.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escoltant al port ${PORT}`));
