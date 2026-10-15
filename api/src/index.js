require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // <-- Afegir aquesta línia

const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => res.send('API AgroBotiga en marxa'));

// Muntar rutes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes); // <-- Afegir aquesta línia

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escoltant al port ${PORT}`));