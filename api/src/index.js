// QUÈ FA: arrenca el servidor Express i munta tota l'API.
// AMB QUÈ CONNECTA:
//   - .env: configuració (PORT, MONGO_URI, JWT_SECRET).
//   - config/db.js: connexió a MongoDB.
//   - routes: productes, categories i usuaris.
//   - errorHandler: resposta comuna per a qualsevol error.
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

// Sense JWT_SECRET no es podrien signar ni verificar els tokens del login.
if (!process.env.JWT_SECRET) {
    console.error('Falta la variable JWT_SECRET al fitxer .env');
    process.exit(1);
}

const app = express();
app.use(express.json()); // Permet llegir req.body en format JSON.

connectDB(); // Connecta amb MongoDB abans d'atendre peticions.

app.get('/', (req, res) => res.send('API AgroBotiga en marxa'));

// Muntar rutes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes); // Registre, login, /me i CRUD d'usuaris.
app.use(errorHandler); // Sempre ha d'anar al final.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escoltant al port ${PORT}`));
