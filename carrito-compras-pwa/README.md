# Mi Empresa Store PWA

Tienda instalable para celular basada en las prácticas 12 y 13: catálogo de productos con imágenes, búsqueda, filtro de disponibilidad, carrito persistente y registro de pedidos. El frontend usa HTML, CSS y JavaScript sin framework; las funciones de Vercel conectan de forma segura con TiDB Cloud.

Los pedidos se registran como **Pendiente de pago**. Esta versión no integra una pasarela ni procesa pagos.

## Requisitos

- Node.js 20 o posterior y npm.
- Una base de datos TiDB Cloud con acceso de red para el despliegue de Vercel.
- Cuenta de GitHub y Vercel.

## Preparar TiDB Cloud

1. Crea un clúster TiDB Cloud Serverless y una base de datos llamada `carrito_de_compras`.
2. Ejecuta `database/schema.sql` dentro de esa base de datos.
3. Ejecuta `database/seed.sql` para cargar productos de muestra. Estos productos no incluyen fotos; puedes agregar bytes JPEG, PNG, GIF o WebP a la columna `Foto`.
4. Crea las credenciales de conexión de la aplicación y autoriza el acceso desde Vercel. Mantén la contraseña y el certificado TLS fuera del repositorio.

La estructura conserva las tablas de la práctica (`cliente`, `producto`, `compras`, `detalle_compras` y `pago`) y sus relaciones. Los precios se calculan y verifican en el servidor utilizando la base de datos; nunca se confía en el precio enviado por el navegador. La actualización de stock y la creación del pedido se realizan en una transacción.

## Desarrollar localmente

```bash
npm install
```

Crea un archivo `.env.local` en la raíz (no lo subas a GitHub) con las credenciales de TiDB:

```dotenv
TIDB_HOST=tu-host.tidbcloud.com
TIDB_PORT=4000
TIDB_USER=tu-usuario
TIDB_PASSWORD=tu-contraseña
TIDB_DATABASE=carrito_de_compras
# Opcional: certificado CA PEM entregado por TiDB Cloud, en una sola variable.
TIDB_SSL_CA="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
```

Inicia el entorno local de Vercel para probar también las funciones API y el service worker:

```bash
npm run dev
```

Este comando descarga Vercel CLI bajo demanda si no está instalado. Abre la URL local que indique Vercel para probar la aplicación. La instalación PWA debe probarse con HTTPS (el despliegue de Vercel ya lo proporciona). La aplicación requiere una conexión para consultar TiDB y registrar pedidos; el catálogo previamente visitado y el carrito sí quedan guardados en el dispositivo.

## Desplegar desde GitHub con Vercel

1. Sube este proyecto a un repositorio GitHub nuevo.
2. En Vercel, importa ese repositorio como proyecto. Para este proyecto dentro de `Codigo---Trinidad`, establece **Root Directory** en `carrito-compras-pwa`. Si subes el contenido de esta carpeta a la raíz de un repositorio nuevo, usa `.`. Selecciona el Framework Preset **Other**.
3. En **Settings → Environment Variables**, agrega `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD` y `TIDB_DATABASE`. Si tu clúster requiere CA explícita, agrega también `TIDB_SSL_CA`.
4. Activa las variables para Production y Preview según necesites, y despliega. Vercel detecta `api/` como funciones serverless y publica el resto como sitio estático.
5. Cada `push` a la rama conectada en GitHub inicia un nuevo despliegue. Mantén los secretos únicamente en la configuración de Vercel.

## Instalar y recibir actualizaciones

Abre el dominio HTTPS de Vercel desde el celular y toca **Instalar app** en la barra superior. En Android y navegadores compatibles, se abre el diálogo nativo de instalación. En iPhone, Safari no ofrece esa API: el botón muestra los pasos **Compartir → Añadir a pantalla de inicio**. También puedes instalar desde el menú del navegador.

El service worker guarda los archivos de la interfaz para abrirla sin conexión y consulta una nueva versión al iniciar y al volver a la aplicación. Cuando Vercel publica una actualización, aparece el aviso **Hay una nueva versión de la tienda** y el botón **Actualizar**. Para cada versión publicada, cambia `APP_VERSION` en `app.js` y aumenta `CACHE_NAME` en `sw.js`; así el dispositivo renueva el caché del sitio. Los pedidos y el catálogo actual requieren conexión.

## Comprobación

```bash
npm run check
```
