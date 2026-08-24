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
tudominio.com/uploads/... →  web, que lo reenvía internamente a api
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

Traefik evalúa las reglas de ruta más específicas primero, así que `/api` gana
sobre `/` sin configuración extra. `/uploads` **no** depende de eso — en la
práctica, hacer que Traefik priorice esa ruta hacia el servicio `api` por
encima de la regla `Host(...)` sin ruta del servicio `web` resultó poco fiable
en EasyPanel (redesplegar no lo corregía). En vez de pelear con eso, `web`
(nginx) reenvía `/uploads/` directo a `api` por la red interna — ver
`UPLOADS_UPSTREAM` en la sección 3.

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

**Dominios:** añade una entrada al puerto `3000`:

| Host           | Ruta       |
| -------------- | ---------- |
| `tudominio.com` | `/api`     |

Deja la ruta **sin recortar** (sin *strip path*): la API espera recibir el
`/api/v1` completo, porque es su prefijo global.

`/uploads` **no** lleva entrada aquí — lo sirve el servicio `web`, que lo
reenvía internamente a este servicio por la red del proyecto (ver la variable
`UPLOADS_UPSTREAM` en la sección 3). Si ya tienes una entrada vieja de
`/uploads` apuntando aquí de una configuración anterior, puedes borrarla sin
problema; no hace nada porque `web` intercepta esa ruta primero.

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

**Variables de entorno:**

```env
VITE_API_URL=/api/v1
VITE_STOREFRONT_ROOT_DOMAIN=tudominio.com
UPLOADS_UPSTREAM=yws_api:3000
```

`VITE_API_URL` es una ruta relativa a propósito: el navegador la resuelve contra
el origen actual, así que el mismo contenedor sirve `tudominio.com` y cualquier
subdominio de tienda, sin reconstruir la imagen.

`VITE_STOREFRONT_ROOT_DOMAIN` activa los subdominios por tienda (sección 7). Si
la dejas vacía, las tiendas solo son accesibles en `/store/<slug>`.

`UPLOADS_UPSTREAM` es la dirección del servicio `api` en la red interna del
proyecto (mismo formato que `DATABASE_URL` usa para Postgres, con el puerto de
la API). nginx reenvía ahí toda petición a `/uploads/`, en vez de depender de
una regla de ruta de Traefik hacia el servicio `api` — ver la nota al inicio de
este documento. Si ya configuraste `PRERENDER_UPSTREAM` (sección 7, para las
vistas previas de WhatsApp) con la misma dirección, puedes omitir esta
variable: cae a ese valor por defecto. Sin ninguna de las dos, `/uploads/`
responde `502` en vez de servir HTML disfrazado de imagen.

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

## 7. Subdominios por tienda

Con `VITE_STOREFRONT_ROOT_DOMAIN` configurada, cada tienda queda accesible en su
propio subdominio y el storefront se monta en la raíz:

```
mitienda.tudominio.com/                   →  portada de la tienda
mitienda.tudominio.com/product/<id>       →  producto
mitienda.tudominio.com/cart, /checkout    →  carrito y checkout
```

Las rutas `/store/<slug>` **siguen funcionando** en el dominio principal, así que
los enlaces que ya hayas repartido no se rompen.

### Qué hace cada lado

El frontend deduce el slug del hostname: toma la etiqueta que está justo debajo
del dominio raíz. El dominio raíz a secas y `www` son la plataforma, no una
tienda, igual que los subdominios reservados (`api`, `admin`, `app`, `panel`,
`static`, `cdn`, `mail`). Un host con dos etiquetas por debajo del raíz
(`a.b.tudominio.com`) tampoco cuenta como tienda.

En un subdominio de tienda **solo existe el storefront**: el panel de
administración, el login y el panel de plataforma no están montados ahí y
devuelven 404. Un cliente no puede acabar en el admin desde la tienda.

El backend ya resolvía el tenant por subdominio desde antes
(`src/common/middleware/tenant.middleware.ts`), aunque en la práctica no depende
de eso: el frontend sigue enviando el slug en la cabecera `X-Tenant-ID`, que
tiene prioridad.

### Configuración en el VPS

1. **DNS:** añade un registro comodín `*.tudominio.com` de tipo `A` apuntando a
   la IP del VPS, además del registro del dominio raíz.
2. **EasyPanel:** añade el host `*.tudominio.com` al servicio `web` (ruta `/`), y
   también al servicio `api` para la ruta `/api` — si no, las peticiones desde
   un subdominio de tienda no encuentran la API. `/uploads` no necesita entrada
   propia: la sirve `web` en cualquier host, comodín incluido.
3. **Certificado:** un certificado comodín necesita validación **DNS-01**, no la
   HTTP-01 por defecto. Hay que configurar en EasyPanel el proveedor DNS de tu
   dominio (token de API de Cloudflare u otro) para que pueda emitirlo.

El paso 3 es el que suele atascar. Si no quieres lidiar con DNS-01 todavía, deja
`VITE_STOREFRONT_ROOT_DOMAIN` vacía y sigue con `/store/<slug>`, que funciona con
el certificado normal del dominio.

### Dominios propios por tienda

Sigue **sin estar soportado**. La resolución por hostname del backend extrae la
primera etiqueta del `Host`, así que solo entiende subdominios del dominio raíz;
un dominio completamente distinto (`latiendadeana.com`) necesitaría una búsqueda
por dominio completo en la base de datos, que hoy no existe. Es trabajo de
backend, no de frontend.

### En local

`*.localhost` resuelve a 127.0.0.1 en Chrome y Firefox, así que puedes probarlo
sin tocar `/etc/hosts`:

```env
# .env.local
VITE_STOREFRONT_ROOT_DOMAIN=localhost
```

Con eso, `http://mitienda.localhost:5173/` sirve la tienda `mitienda` y
`http://localhost:5173/` sigue siendo la plataforma.

## SEO: lo que está resuelto y lo que no

Cada página del storefront genera su propio `<title>`, `description`, etiquetas
Open Graph y datos estructurados JSON-LD (`Store` en la portada, `Product` con
precio y disponibilidad en cada producto). El carrito y el checkout van con
`noindex`, y `<html lang>` sigue al idioma elegido. Hay un `robots.txt` en
`public/`.

Esto lo genera React en el navegador, y **Google ejecuta JavaScript**, así que
para búsqueda funciona.

### Vistas previas de enlaces (WhatsApp, Facebook, Telegram)

Los desplegadores de enlaces leen el HTML crudo y **no ejecutan JavaScript**, así
que las etiquetas que genera React no existen para ellos. Sin nada más, compartir
el enlace de una tienda mostraría el título genérico de la plataforma y ninguna
imagen.

Para eso nginx desvía **solo a esos user-agents** hacia un endpoint de la API,
`GET /api/v1/storefront/preview`, que devuelve HTML real con las etiquetas de esa
tienda o producto. Los navegadores y los buscadores siguen recibiendo la SPA
intacta.

**Configuración:** una sola variable en el servicio `web`.

```env
PRERENDER_UPSTREAM=yws_api:3000
```

Es la dirección de la API en la red interna del proyecto — el mismo nombre de
host que usaste en `DATABASE_URL` para Postgres, con el puerto de la API. **Si la
dejas vacía, la función queda inerte** y todo se comporta como sin ella; no hay
riesgo de romper el sitio por no configurarla.

Opcionalmente, `DNS_RESOLVER` (por defecto `127.0.0.11`, el DNS interno de
Docker) si tu entorno resuelve nombres de otra forma.

**Detalles que conviene conocer:**

- **Los buscadores no pasan por aquí, a propósito.** Google ejecuta JavaScript;
  si le sirviéramos este HTML mínimo indexaría el resumen en lugar de la página
  real, que sería peor que no hacer nada.
- Funciona en los dos modos de multitenencia: por subdominio (el tenant sale del
  `Host`) y por ruta `/store/<slug>`.
- Las peticiones a ficheros con extensión nunca se desvían, así que un bot que
  pida un `.js` o una imagen recibe el fichero.
- Una tienda o producto inexistente devuelve una vista previa genérica válida, no
  un error.

**Para probarlo** una vez desplegado, sin esperar a WhatsApp:

```bash
curl -A "WhatsApp/2.23" https://mitienda.tudominio.com/product/<id> | grep og:
```

Debe salir el `og:title` con el nombre del producto y el `og:image` con su foto.
Las herramientas oficiales de depuración de Facebook y Telegram también sirven, y
además fuerzan el refresco de su caché — útil porque **guardan la vista previa
durante días**: si compartiste un enlace antes de este despliegue, seguirás viendo
la versión antigua hasta que caduque o la refresques a mano.

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
