# Noxfit API

Backend en Express y MongoDB para miembros, trainers y reservas.

## Requisitos

- Node.js 20.19 o superior
- MongoDB accesible desde `MONGODB_URI`

## Variables de entorno

Crea un archivo `.env` en la raíz con estas variables:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/noxfit
JWT_SECRET=replace-with-a-long-random-secret
TRAINER_BOOTSTRAP_TOKEN=replace-with-a-one-time-bootstrap-token
SEED_DEFAULT_PASSWORD=Noxfit123
SEED_ADMIN_TRAINER_ID=
PORT=3000
```

Notas:

- `TRAINER_BOOTSTRAP_TOKEN` solo se usa para crear el primer trainer admin desde el endpoint público.
- `SEED_ADMIN_TRAINER_ID` es opcional. Si no se define, el seed marca como admin al primer trainer de `data/trainers.csv`.
- `SEED_DEFAULT_PASSWORD` define la contraseña inicial para las cuentas cargadas por el seed.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Verificación

```bash
npm test
npm run check
```

## Seed de datos

```bash
npm run seed
```

El seed ahora:

- normaliza las fechas de reservas y altas a formato de solo día
- asigna admin al trainer indicado por `SEED_ADMIN_TRAINER_ID` o al primero del CSV
- marca ese trainer como `bootstrap_admin`

## Bootstrap del primer trainer admin

Si la base de datos no tiene trainers, puedes crear el primer admin con el endpoint público:

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

Después de crear el primer trainer admin:

- el registro público de trainers queda cerrado
- los trainers adicionales deben crearse desde las rutas protegidas de admin

## Endpoints base

- `GET /api/health`
- `POST /api/members/register`
- `POST /api/members/login`
- `POST /api/trainers/register` para bootstrap inicial solamente
- `POST /api/trainers/login`
- `GET /api/members/me`
- `GET /api/trainers/me`
- `GET /api/reservations`
