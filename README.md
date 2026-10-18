# Noxfit API

API REST para gestionar members, trainers y reservations de Noxfit.

El backend está construido con Express 5, MongoDB con Mongoose y autenticación JWT Bearer. Todas las rutas públicas del contrato viven bajo el prefijo `/api`.

El repositorio ahora incluye además un frontend React separado en `frontend/`, pensado como panel operativo para trabajar sobre members, trainers y reservations.

## Resumen técnico

- Runtime: Node.js 20.19+
- Framework HTTP: Express 5
- Frontend: React 19 + Vite
- Base de datos: MongoDB
- ODM: Mongoose
- Auth: JWT Bearer
- Password hashing: bcryptjs
- Documentación: OpenAPI 3.1 + Swagger UI
- Tests: Node test runner + Supertest + mongodb-memory-server

## Estructura del proyecto

```text
src/
  server.js                -> arranque del servidor
  app.js                   -> middlewares, rutas y manejo global de errores
  config/                  -> auth, base de datos, validaciones, Cloudinary
  controllers/             -> lógica de negocio
  routes/                  -> definición de endpoints
  middleware/              -> auth, validación, asyncHandler, 405
  models/                  -> esquemas e índices Mongoose
  http/                    -> helpers de respuestas y errores
scripts/
  seed.js                  -> carga inicial desde CSV
  build-workbook.js        -> genera un Excel a partir de los CSV actuales
  check-openapi.js         -> validación del contrato OpenAPI
frontend/
  src/                     -> app React, hooks, componentes y estilos
data/
  *.csv                    -> datos tabulares fuente
  noxfit-data.xlsx         -> workbook Excel generado para el seed
test/
  *.test.js                -> pruebas unitarias e integración
```

## Requisitos

- Node.js 20.19 o superior
- Una instancia de MongoDB accesible por `MONGODB_URI`

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/noxfit
JWT_SECRET=replace-with-a-long-random-secret
TRAINER_BOOTSTRAP_TOKEN=replace-with-a-one-time-bootstrap-token
SEED_DEFAULT_PASSWORD=Noxfit123
SEED_ADMIN_TRAINER_ID=
PORT=3000

# Opcionales
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Obligatorias para ejecutar la API:

- `MONGODB_URI`
- `JWT_SECRET`

Obligatoria para el bootstrap público del primer trainer admin:

- `TRAINER_BOOTSTRAP_TOKEN`

Opcionales:

- `PORT`: puerto HTTP; por defecto `3000`
- `SEED_DEFAULT_PASSWORD`: contraseña fallback usada por el seed cuando una fila no trae `password`; por defecto `Noxfit123`
- `SEED_ADMIN_TRAINER_ID`: selecciona qué trainer del CSV será admin inicial
- `CLOUDINARY_*`: infraestructura de subida de imágenes ya preparada, pero sin endpoints públicos en esta versión

## Instalación

```bash
npm install
npm install --prefix frontend
```

## Ejecución

Desarrollo:

```bash
npm run dev
```

Frontend en desarrollo:

```bash
npm run frontend:dev
```

Ejecución local:

```bash
npm start
```

El servidor escucha en:

```text
http://localhost:3000
```

La base URL del API es:

```text
http://localhost:3000/api
```

El frontend de Vite arranca por defecto en:

```text
http://localhost:5173
```

Si el API no está en `http://localhost:3000`, configura `VITE_API_BASE_URL` antes de arrancar el frontend.

## OpenAPI

El contrato compartido entre backend y frontend está definido en `openapi.json`.

- Documento JSON servido por la API: `GET /api/openapi.json`
- Documentación Swagger UI: `GET /api/docs`
- Versión del contrato: OpenAPI 3.1

Validación local:

```bash
npm run openapi:check
```

El repositorio incluye un workflow de GitHub Actions que ejecuta esta validación en cada `push` y `pull_request`.

## Verificación local

Chequeo rápido del proyecto:

```bash
npm run check
```

Build del frontend:

```bash
npm run frontend:build
```

Suite de tests:

```bash
npm test
```

## Seed de datos

El proyecto incluye una carga inicial a partir de CSV.

```bash
npm run seed
```

También puedes generar el workbook Excel que el seed detecta automáticamente:

```bash
npm run data:workbook
```

El seed:

- limpia las colecciones antes de insertar datos
- prioriza `data/noxfit-data.xlsx` si existe, y en caso contrario usa `data/members.csv`, `data/trainers.csv` y `data/reservations.csv`
- normaliza fechas a día UTC
- convierte campos numéricos
- usa la columna `password` de cada fila para crear el hash de acceso
- usa `SEED_DEFAULT_PASSWORD` solo si una fila no trae `password`
- marca un único trainer admin inicial

Regla de admin inicial:

- si `SEED_ADMIN_TRAINER_ID` está definido, ese trainer será admin
- si no está definido, se usa el primer trainer del CSV

## Convenciones HTTP

Autenticación:

```http
Authorization: Bearer <token>
```

Respuesta de colecciones:

```json
{
  "items": [],
  "total": 0
}
```

Respuesta de error:

```json
{
  "error": "Message"
}
```

Actualizaciones:

- el API usa `PATCH` para updates parciales
- `PUT` devuelve `405 Method Not Allowed` en members, trainers y reservations

## Recursos y acceso

### Health

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Comprueba que la API responde |

### Members

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/members/me` | Member | Obtiene el perfil autenticado |
| PATCH | `/api/members/me` | Member | Actualiza el perfil autenticado |
| PUT | `/api/members/me` | Member | No permitido |
| GET | `/api/members` | Trainer admin | Lista members |
| POST | `/api/members` | Trainer admin | Crea un member |
| GET | `/api/members/:member_id` | Trainer admin | Obtiene un member por `member_id` |
| PATCH | `/api/members/:member_id` | Trainer admin | Actualiza un member |
| PUT | `/api/members/:member_id` | Trainer admin | No permitido |
| DELETE | `/api/members/:member_id` | Trainer admin | Elimina un member si no tiene reservas vinculadas |

Campos relevantes de member:

- `member_id`
- `full_name`
- `email`
- `password`
- `phone`
- `membership_type`: `Básica`, `Premium`, `VIP`
- `join_date`
- `active`

### Trainers

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/trainers/register` | No + `x-bootstrap-token` | Crea el primer trainer admin si todavía no existen trainers |
| GET | `/api/trainers/me` | Trainer | Obtiene el perfil autenticado |
| PATCH | `/api/trainers/me` | Trainer | Actualiza el perfil autenticado |
| PUT | `/api/trainers/me` | Trainer | No permitido |
| GET | `/api/trainers` | Trainer admin | Lista trainers |
| POST | `/api/trainers` | Trainer admin | Crea un trainer |
| GET | `/api/trainers/:trainer_id` | Trainer admin | Obtiene un trainer por `trainer_id` |
| PATCH | `/api/trainers/:trainer_id` | Trainer admin | Actualiza un trainer |
| PUT | `/api/trainers/:trainer_id` | Trainer admin | No permitido |
| DELETE | `/api/trainers/:trainer_id` | Trainer admin | Elimina un trainer si no tiene reservas vinculadas |

### Auth

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | No | Login unificado para `member` o `trainer` usando `role`, `email` y `password` |

Campos relevantes de trainer:

- `trainer_id`
- `full_name`
- `email`
- `password`
- `activity_type`
- `phone`
- `years_experience`
- `hourly_rate`
- `is_admin`
- `active`

Notas de acceso:

- el registro público de trainers solo sirve para crear el primer trainer admin
- después del primer alta, `/api/trainers/register` queda cerrado
- un trainer autenticado no admin puede acceder a `/api/trainers/me`, pero no al módulo de reservations ni a rutas admin

### Reservations

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| GET | `/api/reservations` | Member o Trainer admin | Lista reservas |
| POST | `/api/reservations` | Member o Trainer admin | Crea una reserva |
| GET | `/api/reservations/:reservation_id` | Member o Trainer admin | Obtiene una reserva |
| PATCH | `/api/reservations/:reservation_id` | Member o Trainer admin | Actualiza una reserva |
| PUT | `/api/reservations/:reservation_id` | Member o Trainer admin | No permitido |
| DELETE | `/api/reservations/:reservation_id` | Member o Trainer admin | Elimina una reserva |

Campos relevantes de reservation:

- `reservation_id`
- `member_id`
- `trainer_id`
- `activity_type`
- `date`
- `time_slot`
- `status`: `Confirmada`, `Completada`, `Cancelada`
- `price`

Filtros soportados en `GET /api/reservations`:

- `status`
- `activity_type`
- `date`
- `member_id`
- `trainer_id`

Restricciones de acceso:

- un member solo puede ver sus propias reservas
- un member no puede consultar reservas de otro member usando `member_id`
- un member no puede crear reservas para otra cuenta
- un member no puede mover una reserva a otro member
- un trainer no admin no puede acceder a reservations

## Respuestas de autenticación

El registro público y login de members devuelven:

```json
{
  "token": "jwt",
  "user": {
    "member_id": "member-1",
    "full_name": "Member Example",
    "email": "member@example.test"
  }
}
```

El registro bootstrap y login de trainers devuelven el mismo formato, con `user` adaptado al recurso trainer.

Las respuestas saneadas no exponen `password_hash`.

## Bootstrap del primer trainer admin

Si todavía no existe ningún trainer en la base de datos, el primer admin puede crearse mediante un endpoint público protegido por cabecera:

```bash
curl -X POST http://localhost:3000/api/trainers/register \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-token: replace-with-a-one-time-bootstrap-token' \
  -d '{
    "trainer_id": "trainer-admin",
    "full_name": "Trainer Admin",
    "email": "admin@noxfit.test",
    "password": "Noxfit123",
    "activity_type": "CrossFit"
  }'
```

Comportamiento:

- falla con `503` si `TRAINER_BOOTSTRAP_TOKEN` no está configurado
- falla con `403` si la cabecera `x-bootstrap-token` no coincide
- falla con `403` si ya existe al menos un trainer
- crea un trainer con `is_admin: true`

## Reglas de validación relevantes

- `email` debe tener formato válido
- `password` debe tener al menos 8 caracteres
- `membership_type` debe ser `Básica`, `Premium` o `VIP`
- `status` de reserva debe ser `Confirmada`, `Completada` o `Cancelada`
- `years_experience`, `hourly_rate` y `price` deben ser números positivos o cero
- `active` e `is_admin` deben ser booleanos cuando el endpoint permita enviarlos
- `time_slot` debe usar el formato `HH:MM - HH:MM` y la hora final debe ser posterior a la inicial
- `date` se normaliza a medianoche UTC

## Reglas de negocio importantes

- members y trainers usan identificadores de dominio (`member_id`, `trainer_id`, `reservation_id`) en vez de exponer `_id` como contrato principal
- un member o trainer inactivo no puede autenticarse ni operar con un token válido
- no se puede borrar un member o trainer si tiene reservas vinculadas; la API devuelve `409 Conflict`
- los conflictos de agenda se validan en aplicación y también mediante índices únicos parciales en MongoDB
- los índices de conflicto solo se aplican a reservas con estado `Confirmada` o `Completada`

## Cobertura de tests actual

La suite actual cubre, entre otros casos:

- exposición del contrato OpenAPI y Swagger UI
- login de members
- login de trainers
- bootstrap del primer trainer admin
- restricciones de acceso a reservations
- rechazo de `PUT` en endpoints que solo admiten `PATCH`
- normalización de fechas
- conflictos de agenda
- errores JSON para rutas `/api` desconocidas

## Estado actual del contrato

- todas las rutas del dominio viven bajo `/api`
- no hay versionado de API todavía
- no hay paginación todavía
- no hay endpoints públicos de subida de archivos todavía
