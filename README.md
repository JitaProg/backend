# 🛍️ AgroBotiga - E-commerce API Backend

> Projecte desenvolupat per a l'assignatura de Desenvolupament d'Aplicacions Web (DAW) a l'Escola Jaume Viladoms.

---

## 🛠️ Tecnologies i Arquitectura
* **Backend**: Node.js, Express.js
* **Base de Dades**: MongoDB, Mongoose (Models orientats a documentació NoSQL)
* **Validació i Control**: Validadors personalitzats de Mongoose, sistemes de paginació i filtrat avançat.
* **Proves i Documentació**: Postman (Col·lecció "Ecommerce API" amb entorn local i scripts de test automatitzats).

---

## 📂 Estructura de l'API i Endpoints (CRUD)

L'API s'estructura al entorn de rutes `/api` amb controladors unificats que retornen respostes en format JSON estandaritzat (`{ success: true, data: ... }`).

### 1. Categories (`/api/categories`)
* **POST**: Crear una nova categoria (amb validació d'unicitat per a `slug`).
* **GET**: Llistar categories amb suport per a filtres de cerca (`name`, `active`) i paginació (`page`, `limit`).
* **GET /:id**: Obtenir una categoria específica pel seu identificador.
* **PUT /:id**: Actualitzar dades d'una categoria.
* **DELETE /:id**: Baixa lògica (*soft delete* modificant l'estat a `actiu: false`).

### 2. Usuaris (`/api/users`)
* **POST**: Registrar un nou usuari (amb xifrat de contrasenya).
* **GET**: Llistar usuaris de forma paginada.
* **GET /:id**: Consultar un usuari per ID (assegurant que **mai** s'exposa el camp `password_hash`).
* **PUT /:id**: Actualitzar dades de l'usuari.
* **DELETE /:id**: Baixa lògica de l'usuari.

### 3. Productes (`/api/products`)
* **POST**: Crear un producte associat a una categoria existent (`categoria_id` amb referència Mongoose), validant preu superior a 0, estoc no negatiu i codi de barres (*SKU*) únic.
* **GET**: Llistar productes amb `.populate('categoria_id')`, filtres per estat/nom i paginació completa.
* **GET /:id**: Detall d'un producte concret amb la seva categoria poblada.
* **PUT /:id**: Actualització de preus o estoc aplicant validacions de l'esquema.
* **DELETE /:id**: Baixa lògica del producte (*soft delete*).

### Estructura de la API
agro-botiga-api/
│
├── src/
│   ├── config/         # Configuració de la connexió a la base de dades
│   ├── controllers/    # Lògica de control per a cada entitat (categories, usuaris, productes)
│   ├── models/         # Esquemes de Mongoose (Mongoose Schemas & validacions)
│   ├── routes/         # Definició de rutes de l'API REST (/api/categories, etc.)
│   ├── services/       # Serveis de negoci (paginació, filtres, soft-delete)
│   └── app.js          # Configuració principal d'Express i Middlewares
│
├── .env                # Variables d'entorn locals
├── package.json        # Dependències i scripts del projecte
└── README.md           # Documentació de l'API

---

## 🧪 Verificació amb Postman (Punt 4.6)
El projecte inclou la col·lecció exportable **`Ecommerce API`** configurada amb:
* **Entorn Local**: Utilització de la variable global `{{baseUrl}}` apuntant a `http://localhost:3000`.
* **Tests Automatitzats (Scripts Post-response)**: Comprovació automàtica de codis d'estat (`201`), tipus de resposta JSON i validació de privadesa (assegurant l'absència de camps sensibles com `password_hash`).

---

## 🚀 Com executar el projecte en local

### 1️⃣ Clonar el repositori
```bash
git clone [https://github.com/tu-usuario/nombre-del-repositorio.git](https://github.com/tu-usuario/nombre-del-repositorio.git)
cd nombre-del-repositorio
```

2️⃣ Instal·lar dependències
```bash
npm install
```

3️⃣ Configurar les variables d'entorn

Crea un fitxer .arxiu o .env amb la connexió a la teva base de dades local de MongoDB i el port del servidor (per defecte 3000).

4️⃣ Executar l'aplicació
```bash
npm run dev
```
---

👤 Autor

Nom: Borja Lozano Porcel
Assignatura: Desenvolupament Web Full Stack / DAW (Escola Jaume Viladoms)
