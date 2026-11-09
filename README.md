# 🛍️ AgroBotiga - E-commerce API Backend

> Projecte desenvolupat per a l'assignatura de Desenvolupament d'Aplicacions Web (DAW) a l'Escola Jaume Viladoms.

---

## 🛠️ Tecnologies i Arquitectura
* **Backend**: Node.js, Express.js
* **Base de Dades**: MongoDB, Mongoose (Models orientats a documentació NoSQL)
* **Validació i Control**: Validadors personalitzats de Mongoose, sistemes de paginació i filtrat avançat.
* **Seguretat**: Hash de contrasenyes amb `bcryptjs` i autenticació amb **JWT access token + refresh token**, rotació segura i detecció de reutilització (`jsonwebtoken`).
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
* **POST /register**: Registrar un nou usuari (amb xifrat de contrasenya i whitelist de camps).
* **POST /login**: Autenticar un usuari i retornar un `accessToken` i un `refreshToken`.
* **POST /refresh**: Renovar el parell de tokens amb un `refreshToken` vàlid (rotació).
* **POST /logout**: Tancar la sessió i revocar la família de refresh tokens.
* **POST /logout-all**: Tancar totes les sessions de l'usuari (requereix access token).
* **GET /me**: Obtenir el perfil de l'usuari autenticat (requereix `Authorization: Bearer <accessToken>`).
* **POST**: Crear un usuari des del CRUD d'administració.
* **GET**: Llistar usuaris de forma paginada.
* **GET /:id**: Consultar un usuari per ID (assegurant que **mai** s'exposa el camp `password_hash`).
* **PUT /:id**: Actualitzar dades de l'usuari.
* **DELETE /:id**: Baixa lògica de l'usuari.

#### Autenticació amb JWT + Refresh Token (Sessió 8)
1. `POST /api/users/register` amb `nom`, `cognoms`, `email`, `password` i `telefon` opcional.
2. `POST /api/users/login` amb `email` i `password`. La resposta inclou:
   * `data.accessToken`: token curt (per defecte `15m`) per a les rutes protegides.
   * `data.refreshToken`: token llarg (per defecte `7d`) per renovar l'access token.
   * `data.token`: àlies de `accessToken` per compatibilitat amb el client anterior.
3. Enviar l'access token a les rutes protegides: `Authorization: Bearer <accessToken>`.
4. Quan l'access token caduca, cridar `POST /api/users/refresh` amb `{ "refreshToken": "..." }`.
   La resposta conté un **parell nou** de tokens i el refresh token anterior queda revocat.
5. Per tancar la sessió, cridar `POST /api/users/logout` amb `{ "refreshToken": "..." }`.

##### Rotació i detecció de reutilització
* Cada refresh token s'usa **una sola vegada**. En renovar-lo, es marca com a revocat i se substitueix per un de nou dins la mateixa família (`familia_id`).
* Si un refresh token ja utilitzat es torna a enviar, el servei detecta la reutilització, revoca **tota la família** i respon `401 REFRESH_TOKEN_REUSED`.
* A MongoDB només es desa el **hash SHA-256** del refresh token, no el token en clar.
* L'índex TTL de la col·lecció `tokens` esborra automàticament els documents caducats.
* Els access tokens són stateless: si es revoca la sessió, l'access token continua sent vàlid fins que caduca (màxim `JWT_ACCESS_EXPIRES_IN`). Per això és important que sigui curt.

Codis d'error habituals:
| Codi | HTTP | Significat |
|---|---|---|
| `REFRESH_TOKEN_REQUIRED` | 400 | No s'ha enviat el refresh token |
| `INVALID_REFRESH_TOKEN` | 401 | Token manipulat, desconegut o amb tipus incorrecte |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token caducat |
| `REFRESH_TOKEN_REVOKED` | 401 | Sessió tancada o token revocat |
| `REFRESH_TOKEN_REUSED` | 401 | S'ha reutilitzat un token ja rotat; família revocada |
| `USER_INACTIVE` | 401 | L'usuari no existeix o està desactivat |

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
│   ├── middleware/     # authMiddleware (access token) i errorHandler
│   ├── models/         # Esquemes de Mongoose (Usuari, Producte, Categoria, Token...)
│   ├── routes/         # Definició de rutes de l'API REST (/api/categories, etc.)
│   ├── services/       # Serveis de negoci (CRUD, tokenService: JWT, rotació i revocació)
│   ├── utils/          # Utilitats compartides (createError)
│   └── index.js        # Configuració principal d'Express i Middlewares
│
├── postman/            # Col·lecció Postman amb el flux de tokens
├── .env                # Variables d'entorn locals
├── package.json        # Dependències i scripts del projecte
└── README.md           # Documentació de l'API

---

## 🧪 Verificació amb Postman (Punt 4.6)
El projecte inclou la col·lecció exportable **`Ecommerce API`** configurada amb:
* **Entorn Local**: Utilització de la variable global `{{baseUrl}}` apuntant a `http://localhost:3000`.
* **Tests Automatitzats (Scripts Post-response)**: Comprovació automàtica de codis d'estat (`201`), tipus de resposta JSON i validació de privadesa (assegurant l'absència de camps sensibles com `password_hash`).
* **Flux de tokens**: La carpeta `Users` inclou peticions per fer login, accedir a `/me`, renovar tokens, reutilitzar un refresh token antic (rebuig `401 REFRESH_TOKEN_REUSED`), comprovar un token revocat i fer logout / logout-all. Els scripts desen automàticament `accessToken`, `refreshToken` i `refreshTokenAnterior` a les variables de col·lecció.

Per comprovar la persistència, obre MongoDB Compass i revisa la base de dades `ecommerce`, col·lecció **`tokens`**. Cada login crea un document amb `usuari_id`, `jti`, `familia_id`, `expira_el`, `revocat` i `token_hash` (mai el token en clar).

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

Crea un fitxer `.env` a partir de `api/.env.example` amb la connexió a la teva base de dades local de MongoDB, el port del servidor (per defecte 3000) i els secrets i durades dels tokens:

```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/ecommerce
JWT_SECRET=<cadena_llarga_i_aleatòria>
JWT_REFRESH_SECRET=<una_altra_cadena_llarga_i_aleatòria>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

> `JWT_ACCESS_SECRET` i `JWT_REFRESH_SECRET` són opcionals. Si no es defineixen, s'utilitza `JWT_SECRET` per als dos tipus de token. Si defineixes els dos secrets específics, `JWT_SECRET` no és obligatori. `JWT_EXPIRES_IN` es manté com a alternativa per compatibilitat si no existeix `JWT_ACCESS_EXPIRES_IN`.

4️⃣ Executar l'aplicació
```bash
npm run dev
```
---

👤 Autor

Nom: Borja Lozano Porcel
Assignatura: Desenvolupament Web Full Stack / DAW (Escola Jaume Viladoms)
