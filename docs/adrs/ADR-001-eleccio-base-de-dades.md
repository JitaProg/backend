# ADR-001: Elecció de base de dades

- **Estat:** Acceptada
- **Data:** 2026-09-29

## Context
AgroBotiga és un e-commerce de productes agraris (llavors, adobs, eines, maquinària). El catàleg té atributs molt variables segons el tipus de producte (pes, tipus de cultiu, temporada, potència...) i les comandes han de conservar el preu i el nom del producte en el moment de la compra. Necessitem una base de dades flexible i escalable, ben integrada amb el stack JavaScript (Node/Express i React) i fàcil de reproduir en local.

## Decisió
Farem servir **MongoDB** (base de dades NoSQL orientada a documents) com a base de dades principal, executada en un contenidor **Docker** (WSL2 + Docker Desktop) i administrada visualment amb **MongoDB Compass**. Les credencials es guardaran en un fitxer `.env` exclòs del control de versions (`.gitignore`).

El model conceptual (vegeu `docs/diagrams/er-diagram.png`) identifica entitats fortes (Usuari, Comanda, Producte, Categoria) i entitats febles (Adreça i Mètode de pagament, que no tenen sentit sense un Usuari al qual pertanyin). Aquesta distinció es traduirà a MongoDB de la manera següent:
- **Referències** (`usuari_id`, `categoria_id`, `producte_id`) per a entitats independents.
- **Documents embeguts** per a les entitats febles (`adreces[]` i `metodes_pagament[]` dins del document `Usuari`) i per a dades que viuen i moren amb el document pare (línies de la comanda).
- Quan es crea una comanda, es desarà una **còpia** de l'adreça i el mètode de pagament triats (no una referència), perquè si l'usuari els edita o els esborra més endavant, les comandes ja fetes han de conservar les dades originals.

## Conseqüències
+ Flexibilitat d'esquema: es poden afegir camps i tipus de producte sense migracions.
+ Integració natural amb Node/Express (JSON/BSON) i React.
+ Entorn reproduïble i aïllat gràcies a Docker.
+ Les línies de comanda embegudes conserven l'històric de preus i es llegeixen en una sola consulta.
- Menys adequat per a consultes molt relacionals o analítiques amb molts JOINs.
- La integritat referencial no la garanteix la base de dades: s'ha de controlar des del codi (o amb Mongoose).
- Cal vigilar la duplicació de dades (p. ex. nom del producte a la línia de comanda) i mantenir-la coherent.
