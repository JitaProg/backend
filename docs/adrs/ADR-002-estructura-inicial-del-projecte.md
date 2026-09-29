# ADR-002: Estructura inicial del projecte

- **Estat:** Acceptada
- **Data:** 2026-09-29

## Context
El projecte és Full Stack (React, Node, MongoDB) i cal decidir com organitzar el codi: un únic repositori (monorepo) o repositoris separats. Volem separar clarament la part de client de la part de servidor, facilitar el control de versions i poder desplegar cada part per separat en el futur.

## Decisió
Adoptarem **dos repositoris separats**:
- `agrobotiga-frontend`: aplicació React (interfície d'usuari).
- `agrobotiga-backend`: API REST amb Node/Express, configuració de Docker/MongoDB i documentació del projecte (`/docs/diagrams/` i `/docs/adrs/`).

El frontend es comunicarà amb el backend exclusivament mitjançant l'API REST. Cada repositori tindrà el seu propi `README.md`, `.gitignore` i gestió de dependències.

## Conseqüències
+ Separació clara de responsabilitats entre presentació i lògica de negoci/dades.
+ Versionat i desplegament independents (actualitzar el frontend sense tocar el backend).
+ Facilita CI/CD específic per a cada tecnologia.
+ Cada repositori és més petit i simple de navegar.
- Cal gestionar dos repositoris, dos terminals i dues configuracions en local.
- Els canvis que afecten l'API requereixen coordinar dos repositoris (versions i contracte de l'API).
- No es poden fer commits atòmics que toquin frontend i backend alhora.
