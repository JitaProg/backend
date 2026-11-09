# Sessió 8 — Access Token, Refresh Token i rotació segura

Aquest document explica la implementació del sistema de tokens de la Sessió 8 a l'API AgroBotiga. Es pot exportar a PDF per lliurar-lo juntament amb l'enllaç al repositori.

---

## 1. Resum

S'ha substituït el login amb un únic JWT de llarga durada per un sistema de dos tokens:

| Token | Durada per defecte | On es guarda | Per a què serveix |
|---|---|---|---|
| **Access token** | 15 minuts | Al client (memòria/localStorage) | Accedir a rutes protegides (`Authorization: Bearer ...`) |
| **Refresh token** | 7 dies | Al client + hash a MongoDB (`tokens`) | Obtenir un nou parell de tokens quan l'access token caduca |

El refresh token és d'**un sol ús**: cada vegada que es renova, el token antic queda revocat i se'n genera un de nou dins la mateixa **família**. Si algú intenta reutilitzar un token antic, es revoca tota la família i es retorna `401 REFRESH_TOKEN_REUSED`.

---

## 2. Per què aquesta estratègia

1. **Reduir el risc d'un access token robat**: només és vàlid 15 minuts.
2. **Permetre sessions llargues sense tornar a fer login**: el refresh token dura 7 dies.
3. **Rotació**: cada refresh token només funciona una vegada.
4. **Detecció de reutilització**: si un token robat s'intenta fer servir després que el legítim l'hagi rotat, es detecta i es tanca la sessió.
5. **Revocació**: els refresh tokens es poden invalidar a MongoDB en qualsevol moment (logout, logout global o desactivació de l'usuari).
6. **Minimitzar danys si es filtra MongoDB**: només es desa el hash SHA-256 del refresh token, mai el token en clar.

---

## 3. Flux complet

```
┌────────┐          ┌─────────────────┐          ┌──────────────┐
│ Client │          │      API        │          │   MongoDB    │
└───┬────┘          └────────┬────────┘          └──────┬───────┘
    │  POST /login           │                          │
    │  email + password      │                          │
    ├───────────────────────>│ valida bcrypt            │
    │                        ├─────────────────────────>│ crea Token
    │                        │                          │ (hash, jti,
    │  200 access + refresh  │                          │  familia, TTL)
    │<───────────────────────┤                          │
    │                        │                          │
    │  GET /me               │                          │
    │  Bearer access         │                          │
    ├───────────────────────>│ verifica firma + tipus   │
    │                        ├─────────────────────────>│ busca usuari actiu
    │  200 perfil            │                          │
    │<───────────────────────┤                          │
    │                        │                          │
    │  POST /refresh         │                          │
    │  refreshToken          │                          │
    ├───────────────────────>│ verifica JWT + doc       │
    │                        ├─────────────────────────>│ revoca antic (atòmic)
    │                        │                          │ crea nou refresh
    │  200 nou parell        │                          │
    │<───────────────────────┤                          │
    │                        │                          │
    │  POST /refresh (antic) │                          │
    ├───────────────────────>│ detecta reutilització    │
    │                        ├─────────────────────────>│ revoca família
    │  401 REFRESH_TOKEN_REUSED                         │
    │<───────────────────────┤                          │
```

---

## 4. Fitxers creats

| Fitxer | Funció |
|---|---|
| `api/src/models/token.js` | Model Mongoose del refresh token: `usuari_id`, `jti`, `token_hash`, `familia_id`, `expira_el`, `revocat`, `reemplacat_per`, IP i user-agent. Índex TTL per netejar caducats. |
| `api/src/services/tokenService.js` | Lògica de tokens: generar access/refresh, desar el hash, rotar, detectar reutilització, revocar família i revocar tots els tokens d'un usuari. |
| `docs/adrs/ADR-003-autenticacio-jwt-rotacio-refresh-tokens.md` | Decisió arquitectònica documentada. |
| `docs/sessions/session08-implementacio.md` | Aquest document. |

## 5. Fitxers modificats

| Fitxer | Canvi |
|---|---|
| `api/src/services/userService.js` | El login ja no genera el JWT; només valida credencials i retorna l'usuari. La generació de tokens passa al `tokenService`. |
| `api/src/controllers/userController.js` | `loginUser` retorna `accessToken`, `refreshToken` i `token` (compatibilitat). S'afegeixen `refreshToken`, `logoutUser` i `logoutAll`. |
| `api/src/middleware/authMiddleware.js` | Verifica l'access token amb `JWT_ACCESS_SECRET` (o `JWT_SECRET`) i rebutja refresh tokens a les rutes protegides. |
| `api/src/routes/userRoutes.js` | Noves rutes `POST /refresh`, `POST /logout` i `POST /logout-all` (protegida). |
| `api/src/index.js` | Comentaris i comprovació de configuració actualitzats. |
| `api/.env.example` | Nous secrets i durades: `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. |
| `api/postman/Ecommerce API.postman_collection.json` | Flux de login, refresh, reutilització, logout i logout-all amb tests automàtics. |
| `README.md` | Documentació dels endpoints, flux, codis d'error i variables d'entorn. |

---

## 6. Contracte de l'API

### 6.1 Login

```http
POST /api/users/login
Content-Type: application/json

{
  "email": "joan@example.com",
  "password": "Password123"
}
```

Resposta `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "nom": "Joan",
      "cognoms": "Pérez",
      "email": "joan@example.com",
      "rol": "client"
    },
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "refreshExpiresIn": 604800,
    "token": "eyJhbGciOi..."
  }
}
```

`token` es manté com a àlies de `accessToken` per no trencar el client anterior.

### 6.2 Ruta protegida

```http
GET /api/users/me
Authorization: Bearer <accessToken>
```

Si el token és correcte, respon `200` amb el perfil. Si és incorrecte o ha caducat: `401 UNAUTHORIZED`.

### 6.3 Renovar tokens

```http
POST /api/users/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOi..."
}
```

Resposta `200`:

```json
{
  "success": true,
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 900,
    "refreshExpiresIn": 604800
  }
}
```

El `refreshToken` enviat queda revocat. Cal desar el nou `refreshToken` al client.

### 6.4 Reutilitzar un refresh token antic

```http
POST /api/users/refresh
Content-Type: application/json

{
  "refreshToken": "<token ja rotat>"
}
```

Resposta `401`:

```json
{
  "success": false,
  "error": {
    "code": "REFRESH_TOKEN_REUSED",
    "message": "Reutilització de refresh token detectada. S'ha revocat tota la sessió"
  }
}
```

A més, tots els tokens actius d'aquella família queden revocats.

### 6.5 Logout

```http
POST /api/users/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOi..."
}
```

Resposta `200`:

```json
{
  "success": true,
  "message": "Sessió tancada correctament",
  "data": {
    "revokedTokens": 1
  }
}
```

### 6.6 Logout de tots els dispositius

```http
POST /api/users/logout-all
Authorization: Bearer <accessToken>
```

Resposta `200`:

```json
{
  "success": true,
  "message": "Totes les sessions s'han tancat",
  "data": {
    "revokedTokens": 2
  }
}
```

---

## 7. Com es comuniquen les peces

```
userRoutes.js
   │
   ├── POST /login ──────> userController.loginUser
   │                           ├── userService.loginUser  (MongoDB + bcrypt)
   │                           └── tokenService.issueTokenPair (JWT + MongoDB)
   │
   ├── POST /refresh ────> userController.refreshToken
   │                           └── tokenService.rotateRefreshToken
   │
   ├── POST /logout ─────> userController.logoutUser
   │                           └── tokenService.revokeRefreshToken
   │
   ├── POST /logout-all ─> authMiddleware.protect
   │                           └── userController.logoutAll
   │                                   └── tokenService.revokeAllUserTokens
   │
   └── GET /me ──────────> authMiddleware.protect ──> userController.getMe
                               └── verifica access token i busca l'usuari
```

- **Rutes**: defineixen les URL i els middlewares.
- **Controladors**: reben `req`, extreuen dades, criden serveis i construeixen la resposta HTTP.
- **Serveis**: contenen la lògica de negoci. `userService` valida credencials; `tokenService` gestiona els tokens.
- **Models**: parlen amb MongoDB. `Usuari` i `Token`.
- **Middleware**: `authMiddleware` valida l'access token abans d'arribar al controlador; `errorHandler` unifica els errors.
- **Postman**: executa el flux i desa els tokens en variables de col·lecció.

---

## 8. Decisions de seguretat

### 8.1 Per què dos secrets?
`JWT_ACCESS_SECRET` i `JWT_REFRESH_SECRET` poden ser diferents. Així, un token d'un tipus no pot validar-se com l'altre ni encara que falli la comprovació de `type`. Si no es configuren, tots dos fan servir `JWT_SECRET` per compatibilitat.

### 8.2 Per què hash i no el token en clar?
Si algú aconsegueix llegir la col·lecció `tokens`, només veurà un hash SHA-256. No podrà reconstruir el JWT ni reutilitzar-lo. El token original només el té el client.

### 8.3 Per què `familia_id`?
Cada login obre una família. Totes les rotacions d'aquella sessió comparteixen família. Si es detecta reutilització, es revoca la família sencera, no només el token detectat. Això atura un atacant encara que hagi obtingut un token posterior.

### 8.4 Per què una operació atòmica?
Dues peticions simultànies amb el mateix refresh token podrien passar la comprovació `revocat: false` alhora. `findOneAndUpdate({ _id, revocat: false, expira_el: { $gt: now } })` garanteix que només una el consumeixi. La segona es tracta com a reutilització.

A més, el token nou es crea **abans** de consumir l'antic. Si una petició simultània perd la cursa i revoca la família, el token nou també queda revocat. Així no queda cap token actiu després d'una detecció de reutilització.

### 8.5 Per què l'access token no es revoca immediatament?
És stateless: no es consulta a MongoDB a cada petició. Per això dura 15 minuts. Si es necessités revocació immediata, caldria una llista negra o consultar la sessió a cada request, cosa que trencaria l'avantatge stateless.

### 8.6 Índex TTL
`tokenSchema.index({ expira_el: 1 }, { expireAfterSeconds: 0 })` fa que MongoDB esborri els documents caducats automàticament. Això evita que la col·lecció creixi indefinidament.

---

## 9. Proves amb Postman

La col·lecció `Ecommerce API` inclou aquest ordre dins la carpeta **Users**:

1. **Registrar Usuari** — crea l'usuari de prova.
2. **Login Usuari** — desa `accessToken` i `refreshToken`.
3. **Perfil (token)** — comprova l'accés a `/me`.
4. **Renovar Tokens (Refresh)** — desa el token antic a `refreshTokenAnterior` i els nous a `accessToken` / `refreshToken`.
5. **Logout** — revoca la família i desa el token actual a `refreshTokenLogout`.
6. **Reutilitzar Refresh Token (rebuig)** — envia `refreshTokenAnterior`; ha de retornar `401 REFRESH_TOKEN_REUSED`.
7. **Refresh després de Logout (rebuig)** — envia `refreshTokenLogout`; ha de retornar `401 REFRESH_TOKEN_REVOKED`.
8. **Logout de tots els dispositius** — usa l'access token; ha de retornar `200`.

> Important: executa les peticions en aquest ordre. Si saltes el pas 4, la variable `refreshTokenAnterior` no existirà i el test de reutilització no serà significatiu.

---

## 10. Comprovar MongoDB

Obre MongoDB Compass i revisa:

- Base de dades: `ecommerce` (o la que tinguis a `MONGO_URI`).
- Col·lecció: `tokens`.

Després d'un login veuràs un document semblant a:

```json
{
  "_id": "...",
  "usuari_id": "...",
  "jti": "0f8c...",
  "token_hash": "9f2a...",
  "familia_id": "4b1d...",
  "expira_el": "2026-11-16T...",
  "revocat": false,
  "revocat_el": null,
  "motiu_revocacio": null,
  "reemplacat_per": null,
  "ip": "::1",
  "user_agent": "PostmanRuntime/...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Després d'un refresh, el document antic tindrà:

```json
{
  "revocat": true,
  "revocat_el": "...",
  "motiu_revocacio": "rotacio",
  "reemplacat_per": "<jti del nou token>"
}
```

Després d'un logout, els tokens actius de la família tindran `revocat: true` i `motiu_revocacio: "logout"`. Si has provocat una reutilització, veuràs `motiu_revocacio: "reutilitzacio"`.

---

## 11. Variables d'entorn

```env
PORT=3000
MONGO_URI=mongodb://root:example@localhost:27016/ecommerce?authSource=admin

# Secrets
JWT_SECRET=<cadena llarga i aleatòria>
JWT_REFRESH_SECRET=<una altra cadena llarga i aleatòria>

# Durades
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Variables opcionals:
- `JWT_ACCESS_SECRET`: si existeix, s'usa per signar els access tokens en lloc de `JWT_SECRET`.
- `JWT_EXPIRES_IN`: alternativa antiga a `JWT_ACCESS_EXPIRES_IN`.

---

## 12. Prova manual ràpida (PowerShell)

```powershell
# 1. Login
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/users/login `
  -ContentType 'application/json' `
  -Body '{"email":"joan@example.com","password":"Password123"}'

$access = $login.data.accessToken
$refresh = $login.data.refreshToken

# 2. Ruta protegida
Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/users/me `
  -Headers @{ Authorization = "Bearer $access" }

# 3. Refresh
$new = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/users/refresh `
  -ContentType 'application/json' `
  -Body (@{ refreshToken = $refresh } | ConvertTo-Json)

# 4. Reutilitzar el token antic (ha de fallar amb 401)
try {
  Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/users/refresh `
    -ContentType 'application/json' `
    -Body (@{ refreshToken = $refresh } | ConvertTo-Json)
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

---

## 13. Integració al frontend

1. Després del login, desa `accessToken` i `refreshToken`.
2. A cada petició protegida, envia `Authorization: Bearer <accessToken>`.
3. Si una petició respon `401` per token caducat, crida `/api/users/refresh` amb el `refreshToken`.
4. Substitueix **els dos** tokens pels nous que retorna el refresh.
5. Si el refresh també falla (`REFRESH_TOKEN_EXPIRED`, `REFRESH_TOKEN_REVOKED` o `REFRESH_TOKEN_REUSED`), esborra els tokens i redirigeix al login.
6. Al logout, crida `/api/users/logout` amb el `refreshToken` i esborra els tokens locals.

Recomanació de seguretat: en producció, el refresh token es pot desar en una cookie `HttpOnly`, `Secure` i `SameSite=Strict` en lloc de `localStorage`, per reduir el risc d'XSS. Per a la pràctica amb Postman n'hi ha prou amb les variables de col·lecció.
