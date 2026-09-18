# To-Do List persistente (Vanilla JS fullstack)

App fullstack **sin frameworks de frontend y sin Express**:

- **Frontend:** HTML + CSS + JavaScript vanilla
- **Backend:** Node.js nativo (`http`, `crypto`, `sqlite`)
- **Base de datos:** SQLite (`node:sqlite`, Node 22+)
- **Auth:** registro/login con token tipo JWT (HMAC-SHA256) + `scrypt`

Cada usuario solo ve y modifica **sus** tareas.

Repo: https://github.com/DanyPreisz/todo-fullstack-vanilla

## Funciones

- Crear cuenta e iniciar sesión
- Crear, editar inline, completar y borrar tareas
- Filtros: todas / pendientes / hechas
- Búsqueda por título
- Contador de pendientes
- Borrar todas las completadas
- Persistencia real en `data/app.db`

## Requisitos

- Node.js 22 o superior (probado en 24)
- No hace falta `npm install`

## Cómo correrlo

```bash
git clone https://github.com/DanyPreisz/todo-fullstack-vanilla.git
cd todo-fullstack-vanilla
node server/index.js
```

Abrí [http://localhost:3000](http://localhost:3000)

```bash
npm start
npm run dev
```

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | no | `{ username, password }` |
| POST | `/api/auth/login` | no | `{ username, password }` |
| GET | `/api/auth/me` | sí | usuario actual |
| GET | `/api/todos?filter=all\|active\|completed&q=` | sí | listar |
| POST | `/api/todos` | sí | `{ title }` |
| PATCH | `/api/todos/:id` | sí | `{ title?, completed? }` |
| DELETE | `/api/todos/:id` | sí | borrar una |
| DELETE | `/api/todos` | sí | borrar completadas |

El token va en `Authorization: Bearer <jwt>`.

## Deploy

Ver [DEPLOY-GOOGLE.md](DEPLOY-GOOGLE.md) para publicarlo en Cloud Run desde este mismo repositorio.
