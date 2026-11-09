# ADR-003: Autenticació amb access token, refresh token i rotació segura

- **Estat:** Acceptada
- **Data:** 2026-11-09
- **Sessió:** 08 — Access Tokens i Refresh Tokens

## Context
Fins ara l'API feia servir un únic JWT de llarga durada generat al login. Aquest plantejament té dos problemes:
1. Si es roba el token, l'atacant pot utilitzar-lo fins que caduca.
2. No hi ha manera de revocar la sessió des del servidor, perquè el token és stateless i no es guarda cap registre.

La Sessió 8 demana implementar un sistema amb access token de curta durada, refresh token de llarga durada, rotació del refresh token i detecció d'intents de reutilització (replay attacks). També cal poder tancar sessió i comprovar l'estat dels tokens a MongoDB.

## Decisió
S'implementa el flux següent:

1. **Login** (`POST /api/users/login`):
   - Es valida l'usuari amb bcrypt.
   - Es genera un **access token** JWT de 15 minuts.
   - Es genera un **refresh token** JWT de 7 dies amb un `jti` únic i un `familia_id`.
   - El refresh token es desa a MongoDB **només com a hash SHA-256**, juntament amb la seva caducitat i estat.
2. **Refresh** (`POST /api/users/refresh`):
   - Es verifica la firma i la caducitat del refresh token.
   - Es comprova que el document existeixi i no estigui revocat.
   - Es marca el token antic com a revocat i es crea un de nou dins la mateixa família.
   - Es retorna un parell nou d'access token + refresh token.
3. **Detecció de reutilització**:
   - Si s'envia un refresh token que ja havia estat rotat, es revoca **tota la família** de tokens i es respon `401 REFRESH_TOKEN_REUSED`.
   - El consum del token es fa amb una operació atòmica (`findOneAndUpdate` amb `revocat: false`), de manera que dues peticions simultànies no poden fer servir el mateix token.
4. **Logout** (`POST /api/users/logout`):
   - Es revoca la família associada al refresh token.
   - És idempotent: si el token ja no existeix, respon igualment `200`.
5. **Logout global** (`POST /api/users/logout-all`):
   - Ruta protegida per access token.
   - Revoca tots els refresh tokens actius de l'usuari.
6. **Neteja automàtica**:
   - Un índex TTL a `tokens.expira_el` esborra els documents caducats.

Els access tokens continuen sent stateless i no es consulten a MongoDB a cada petició. A canvi, la seva durada és curta (15 minuts) i les rutes protegides només accepten tokens de tipus `access`.

## Fitxers principals
- `api/src/models/token.js`: esquema dels refresh tokens.
- `api/src/services/tokenService.js`: generació, rotació, revocació i detecció de reutilització.
- `api/src/controllers/userController.js`: login, refresh, logout i logout-all.
- `api/src/middleware/authMiddleware.js`: validació de l'access token.
- `api/src/routes/userRoutes.js`: exposició de les rutes.
- `api/src/services/userService.js`: autenticació de credencials (sense generar tokens).
- `api/.env.example`: secrets i durades configurables.

## Conseqüències
+ Un access token robat només és útil durant 15 minuts.
+ El refresh token es pot revocar i només funciona una vegada.
+ La reutilització d'un token robat revoca automàticament tota la sessió.
+ Els tokens no es guarden en clar a MongoDB.
+ Es poden tancar sessions concretes o totes les de l'usuari.
+ La neteja de tokens caducats és automàtica gràcies a l'índex TTL.
- El refresh requereix consultar MongoDB (no és completament stateless).
- Si es revoca una sessió, l'access token ja emès segueix sent vàlid fins que caduca.
- En cas de dues peticions de refresh simultànies (per exemple, diverses pestanyes), la segona es pot interpretar com a reutilització i tancar la sessió. És el comportament conservador habitual en seguretat.
- Cal coordinar el client perquè desi i roti els tokens correctament.

## Alternatives descartades
- **Només access token de llarga durada:** no permet revocació ni limita el dany d'un robatori.
- **Refresh token sense registre a MongoDB:** no permet detectar reutilització ni revocar sessions.
- **Guardar el refresh token en clar:** una filtració de la base de dades permetria suplantar usuaris.
- **Sessions amb estat al servidor (express-session):** funciona, però s'allunya de l'enfocament JWT stateless demanat a la pràctica.
