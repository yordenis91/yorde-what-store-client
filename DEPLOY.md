# Despliegue en VPS con EasyPanel

Guía completa para levantar la plataforma (frontend + API + Postgres + Redis) en
un VPS gestionado con [EasyPanel](https://easypanel.io). El backend vive en el
repositorio [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api);
su configuración específica de servicio está documentada en el `DEPLOY.md` de ese repo.

## Arquitectura elegida: un solo dominio

Los dos servicios se publican bajo el **mismo origen**, y el proxy interno de
EasyPanel (Traefik) reparte por prefijo de ruta:

```
tudominio.com/            →  web (nginx, puerto 80)
tudominio.com/api/v1/...  →  api (NestJS, puerto 3000)
tudominio.com/uploads/... →  api (imágenes de producto en disco)
```

No es una preferencia estética, resuelve tres problemas concretos:

- **Sin CORS.** El navegador nunca hace una petición cross-origin.
- **La cookie de refresh funciona.** La cookie de sesión se emite con
  `sameSite: 'lax'` (`src/modules/auth/auth.controller.ts:110` en la API). Con el
  frontend y la API en dominios distintos, el navegador no la envía y el login
  se rompe en silencio. Mismo origen lo evita de raíz.
- **Deja abierta la puerta a dominios propios por tienda.** Cuando cada tenant
  conecte su propio dominio, ese dominio sirve frontend y API juntos, y la cookie
  sigue siendo same-site.

Traefik evalúa las reglas de ruta más específicas primero, así que `/api` y
`/uploads` ganan sobre `/` sin configuración extra.

## Antes de empezar

- Un VPS con EasyPanel instalado.
- Un dominio con un registro `A` apuntando a la IP del VPS.
- Los dos repositorios conectados a EasyPanel vía GitHub.

Genera los tres secretos que vas a necesitar (uno distinto cada uno):

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # ENCRYPTION_KEY
```

> **`ENCRYPTION_KEY` es irrecuperable.** Cifra en reposo las credenciales de pago
> y los tokens de bot de cada tienda (AES-256-GCM). Si la cambias o la pierdes,
> esos datos quedan indescifrables y cada tenant tiene que volver a introducirlos.
> Guárdala en un gestor de contraseñas antes de desplegar.

## 1. Bases de datos

Crea un proyecto en EasyPanel (por ejemplo `yws`) y añade dos servicios desde las
plantillas oficiales:

| Servicio   | Plantilla  | Notas                                    |
| ---------- | ---------- | ---------------------------------------- |
| `postgres` | PostgreSQL | 16 o superior. Anota usuario/clave/base.  |
| `redis`    | Redis      | 7 o superior. Anota la contraseña.        |

Ambos quedan accesibles solo dentro de la red interna del proyecto, con nombre de
host `<proyecto>_<servicio>` (p. ej. `yws_postgres`). No les asignes dominio: no
deben ser accesibles desde fuera.

## 2. Servicio `api`

**Origen:** repositorio `yordenis91/yorde-what-store-api`, rama `main`.
**Build:** Dockerfile (el repo trae uno en la raíz).
**Puerto:** `3000`.

**Volumen — este paso no es opcional:**

| Tipo   | Nombre    | Ruta de montaje |
| ------ | --------- | --------------- |
| Volume | `uploads` | `/app/uploads`  |

Las imágenes de producto se guardan en disco local (`src/main.ts:19`). Sin este
volumen, **cada redespliegue borra todas las imágenes de todas las tiendas**.

**Dominios:** añade dos entradas, ambas al puerto `3000`:

| Host           | Ruta       |
| -------------- | ---------- |
| `tudominio.com` | `/api`     |
| `tudominio.com` | `/uploads` |

Deja la ruta **sin recortar** (sin *strip path*): la API espera recibir el
`/api/v1` completo, porque es su prefijo global.

**Variables de entorno:**

```env
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
CORS_ORIGINS=https://tudominio.com

DATABASE_URL=postgresql://USUARIO:CLAVE@yws_postgres:5432/BASE?schema=public

REDIS_HOST=yws_redis
REDIS_PORT=6379
REDIS_PASSWORD=CLAVE_REDIS

JWT_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d

TOTP_ISSUER=YWS
ENCRYPTION_KEY=...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=no-reply@tudominio.com

SUPER_ADMIN_EMAIL=tu@email.com
SUPER_ADMIN_PASSWORD=una-clave-fuerte
```

Dos avisos sobre estas variables:

- **`CORS_ORIGINS` vacío significa "acepta cualquier origen" con credenciales**
  (`src/main.ts:31`: `origin: corsOrigins.length > 0 ? corsOrigins : true`). Con
  mismo origen no se usa, pero déjala puesta como red de seguridad.
- **`ENCRYPTION_KEY` sin definir cae a `JWT_SECRET` y, si tampoco existe, a la
  cadena literal `'insecure-dev-key'`** (`src/config/index.ts`). Defínela siempre.

Las migraciones de Prisma se aplican solas en cada arranque, desde
`docker-entrypoint.sh`. Para desactivarlo, `RUN_MIGRATIONS=false`.

## 3. Servicio `web`

**Origen:** repositorio `yordenis91/yorde-what-store-client`, rama `main`.
**Build:** Dockerfile.
**Puerto:** `80`.
**Dominio:** `tudominio.com`, ruta `/`, puerto `80`. Activa HTTPS — EasyPanel
emite y renueva el certificado Let's Encrypt.

**Variable de entorno:**

```env
VITE_API_URL=/api/v1
```

Es una ruta relativa a propósito: el navegador la resuelve contra el origen
actual, así que el mismo contenedor sirve `tudominio.com` y cualquier dominio de
tienda que conectes después, sin reconstruir la imagen.

### Cómo funciona la configuración en runtime

`VITE_API_URL` es una variable de Vite y normalmente se hornea en el bundle
durante el build, lo que obligaría a reconstruir la imagen por cada entorno. Este
repo lo evita:

1. `public/config.js` define `window.__APP_CONFIG__` con un marcador de posición.
2. Al arrancar el contenedor, `docker-entrypoint.sh` reescribe ese fichero con el
   valor real de la variable de entorno.
3. `resolveApiUrl()` en `src/services/api-client.ts` lee el valor de runtime,
   ignora los marcadores sin sustituir y cae a `VITE_API_URL` de build (que es lo
   que quieres en `npm run dev`).

nginx sirve `/config.js` con `no-store`, así que un redespliegue nunca deja al
navegador hablando con la API del entorno anterior.

## 4. Primer despliegue

Despliega en este orden: `postgres` y `redis` primero, luego `api`, luego `web`.

Cuando la API esté arriba, crea los planes por defecto y la cuenta SUPER_ADMIN.
En la consola del servicio `api`:

```bash
npm run prisma:seed:prod
```

(El script `prisma:seed` normal usa `ts-node`, que no existe en la imagen de
producción. La variante `:prod` corre el seed precompilado.)

## 5. Verificación

```bash
curl https://tudominio.com/api/v1/health     # {"status":"ok",...}
curl -I https://tudominio.com/               # 200, text/html
curl -s https://tudominio.com/config.js      # apiUrl: '/api/v1'
```

Después, en el navegador:

1. Entra a `https://tudominio.com/login` con la cuenta SUPER_ADMIN → debe
   redirigirte a `/platform`.
2. Registra una tienda de prueba en `/register`.
3. Sube una imagen a un producto y **redespliega el servicio `api`**. Si la
   imagen sigue ahí, el volumen está bien montado. Si desapareció, revisa el
   punto 2.
4. Visita `https://tudominio.com/store/<slug>` y completa un pedido por WhatsApp.

## 6. Stripe

En el dashboard de Stripe, añade el endpoint de webhook:

```
https://tudominio.com/api/v1/payments/stripe/webhook
```

Copia el signing secret a `STRIPE_WEBHOOK_SECRET` y redespliega la API. La
verificación de firma necesita el cuerpo crudo, que ya viene habilitado
(`rawBody: true` en `src/main.ts:14`).

## Subdominios por tienda (pendiente)

El backend **ya resuelve el tenant por subdominio**
(`src/common/middleware/tenant.middleware.ts`): acepta `X-Tenant-ID` con id o
slug, y si no viene, extrae el subdominio del `Host`. El frontend todavía no lo
usa — enruta solo por `/store/:slug`.

Para activarlo hará falta, del lado del frontend, resolver el tenant desde el
hostname; y en EasyPanel, un dominio comodín `*.tudominio.com` con un registro
DNS comodín y un certificado wildcard (requiere validación DNS-01, no la HTTP-01
por defecto). Es un trabajo aparte, no incluido en este despliegue.

## Desarrollo local

```bash
# API (repo yorde-what-store-api)
docker compose up -d          # postgres :5433 y redis :6380
cp .env.example .env          # ajusta los secretos
npm install
npm run prisma:migrate && npm run prisma:seed
npm run start:dev

# Frontend (este repo)
cp .env.example .env          # VITE_API_URL=http://localhost:3000/api/v1
npm install
npm run dev
```

En local el frontend corre en `http://localhost:5173` contra la API en
`http://localhost:3000`, que sí es cross-origin — por eso `.env.example` de la
API trae `CORS_ORIGINS=http://localhost:5173`. Como ambos son `localhost`, la
cookie `sameSite: 'lax'` se considera same-site y el login funciona.
