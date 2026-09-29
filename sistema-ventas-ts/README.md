# Sistema de Ventas Web — TypeScript

Réplica del proyecto **Java / JSP de NetBeans (GlassFish)** usando **TypeScript puro**
(Vite en el front-end + Express + MySQL en el back-end), sobre la misma base de datos
MySQL `db_ventas`.

El diseño de pantalla se mantiene idéntico al original: barra `navbar bg-info`, login con
mostrar/ocultar contraseña, formularios `.form-group`, tablas `table-hover` y los botones
`btn-info` / `btn-success` / `btn-warning` / `btn-danger` de los JSP.

---

## 1. Correspondencia con el proyecto Java

| Java (NetBeans / GlassFish) | TypeScript (este proyecto) |
|---|---|
| `web/index.jsp` (login) | `src/vistas/Login.ts` |
| `web/Principal.jsp` (navbar + `<iframe name="myFrame">`) | `src/router.ts` (navbar + router de hash) |
| `web/Empleado.jsp` | `src/vistas/Empleado.ts` |
| `web/Clientes.jsp` *(JSP vacío en el original)* | `src/vistas/Cliente.ts` (CRUD completo) |
| `web/Producto.jsp` *(JSP vacío en el original)* | `src/vistas/Producto.ts` (CRUD completo) |
| `web/RegistrarVenta.jsp` | `src/vistas/RegistrarVenta.ts` |
| `web/js/ojito.js` (ver contraseña) | botón con `bootstrap-icons` en `Login.ts` |
| `Config/Conexion.java` | `server/config/conexion.ts` |
| `Config/GenerarSerie.java` | `server/config/generarSerie.ts` |
| `Controlador/Validar.java` (servlet) | `server/controlador/auth.ts` |
| `Controlador/Controlador.java` (servlet) | `server/controlador/rutas.ts` |
| `Modelo/*.java` | `server/modelo/tipos.ts` (interfaces) |
| `Modelo/*DAO.java` | `server/modelo/*DAO.ts` |
| `?menu=X&accion=Y` | `GET/POST/PUT/DELETE /api/x` |

Cada `menu` del Java se volvió un recurso REST y cada `accion`, un método:

| Java | TypeScript |
|---|---|
| `?menu=Empleado&accion=Listar` | `GET /api/empleados` |
| `?menu=Empleado&accion=Agregar` | `POST /api/empleados` |
| `?menu=Empleado&accion=Editar&id=N` | `GET /api/empleados/:id` |
| `?menu=Empleado&accion=Actualizar` | `PUT /api/empleados/:id` |
| `?menu=Empleado&accion=Delete&id=N` | `DELETE /api/empleados/:id` |
| `accion=BuscarCliente` (por DNI) | `GET /api/clientes/dni/:dni` |
| `accion=BuscarProducto` (por IdProducto) | `GET /api/productos/:id` |
| `accion=Agregar` (ítem a la lista) | estado local de `RegistrarVenta.ts` |
| `accion=GenerarVenta` | `POST /api/ventas` (transacción cabecera + detalle) |
| `accion=Salir` | `POST /api/auth/logout` |

---

## 2. Estructura

```
sistema-ventas-ts/
├── db/
│   └── db_ventas.sql          # esquema + datos (mismos que trinidad.sql)
├── public/img/                # logo.png, java.png (del proyecto Java)
├── server/                    # API Express en TypeScript
│   ├── index.ts               # servidor + sirve dist/
│   ├── config/
│   │   ├── env.ts             # lee .env
│   │   ├── conexion.ts        # pool mysql2  ← Conexion.java
│   │   └── generarSerie.ts    # serie 8 dígitos ← GenerarSerie.java
│   ├── modelo/
│   │   ├── tipos.ts           # Empleado, Cliente, Producto, Venta…
│   │   ├── EmpleadoDAO.ts  ClienteDAO.ts  ProductoDAO.ts  VentaDAO.ts
│   └── controlador/
│       ├── auth.ts            # login/logout/sesión  ← Validar.java
│       └── rutas.ts           # CRUD + ventas       ← Controlador.java
├── src/                       # front Vite en TypeScript (sin framework)
│   ├── main.ts                # punto de entrada
│   ├── router.ts              # navbar + rutas por hash
│   ├── api.ts                 # cliente HTTP + modelos
│   ├── ui.ts                  # helpers de DOM
│   ├── estilos.css            # sustituye a web/css/estilos.css
│   └── vistas/                # Login, Empleado, Cliente, Producto, RegistrarVenta
├── scripts/reset-db.ts        # carga db/db_ventas.sql
├── index.html
├── vite.config.ts
└── tsconfig.json / tsconfig.server.json
```

---

## 3. Puesta en marcha

```bash
npm install
cp .env.example .env        # ajusta DB_USER / DB_PASSWORD si hace falta
npm run db:reset            # crea y carga la base db_ventas
npm run dev                 # API en :3000 + Vite en :5173
```

Abre <http://localhost:5173>.

### Usuarios de prueba

| Usuario | Contraseña | Empleado |
|---|---|---|
| `emp01` | `123456` | Pedro Hernandez |
| `Jo46` | `123456` | Roman Riquelme |
| `Em22` | `123456` | Palermo Suarez |

### Otros comandos

```bash
npm run typecheck   # tsc --noEmit sobre src/ y server/
npm run build       # compila server/ (tsc) y el front (vite build)
npm start           # sirve dist/ + la API desde Express en :3000
```

---

## 4. Base de datos

`db/db_ventas.sql` crea la base `db_ventas` con las mismas tablas, columnas y datos del
dump `trinidad.sql` que usaba el proyecto Java:

- `empleado` (IdEmpleado, Dni, Nombres, Telefono, Estado, User)
- `cliente` (IdCliente, Dni, Nombres, Direccion, Estado)
- `producto` (IdProducto, Nombres, Precio, Stock, Estado)
- `ventas` (IdVentas, IdCliente, IdEmpleado, NumeroSerie, FechaVentas, Monto, Estado)
- `detalle_ventas` (IdDetalleVentas, IdVentas, IdProducto, Cantidad, PrecioVenta)

Clientes de prueba: Dni `1` (Maria Rosas), `2` (Juan Guerrero), `3` (Andres de Santa
Cruz), `4` (Andres Mendoza). Productos con IdProducto `1` a `4` y `7`.

La conexión se toma de `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`),
equivalente a las constantes de `Config/Conexion.java`.

---

## 5. Diferencias respecto al proyecto Java

Son deliberadas: son bugs del original o cosas que la versión Java nunca llegó a
implementar.

1. **Contraseña real.** `Validar.java` pasaba el *DNI* como contraseña
   (`select * from empleado where User=? and Dni=?`). Aquí se añadió la columna
   `Password` (hash bcrypt) y el login es `Usuario + Contraseña`. Un empleado creado
   desde la pantalla de mantenimiento sin contraseña sigue entrando con su DNI, igual
   que antes.
2. **`GenerarSerie` corregido.** La versión Java producía 9 caracteres (`"000000002"`)
   con pocas ventas por solapamiento de rangos. Aquí el relleno es de 8 dígitos exactos.
3. **Errores visibles.** Los `catch (Exception e) {}` vacíos de los DAO ahora devuelven
   el mensaje real al cliente en lugar de fallar en silencio.
4. **IDs parametrizados.** Se eliminó la concatenación de SQL en
   `where IdEmpleado=` + `id`; todo va con parámetros.
5. **Transacción de la venta.** `GenerarVenta` inserta cabecera y detalles en una sola
   transacción (en Java, un fallo a mitad dejaba ventas huérfanas).
6. **Empleado de la venta.** El Java fijaba `IdEmpleado = 2` fijo; aquí se usa el
   empleado que inició sesión.
7. **Clientes y Producto completos.** En el proyecto Java esos dos JSP eran
   placeholders (`<h1>Clientes</h1>`) aunque los DAO existían. Aquí tienen el mismo
   formulario + tabla que `Empleado.jsp`.
8. **Sin bootstrap de `jquery`.** Bootstrap 5 no necesita jQuery; el "ojo" de la
   contraseña usa `bootstrap-icons`.

---

## 6. Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | `{ user, password }` → `{ token, usuario }` |
| `POST` | `/api/auth/logout` | Cierra la sesión |
| `GET` | `/api/auth/session` | Usuario de la sesión actual |
| `GET` | `/api/salud` | Estado del servicio |
| `GET` `POST` | `/api/empleados` | Listar / agregar |
| `GET` `PUT` `DELETE` | `/api/empleados/:id` | Detalle / actualizar / eliminar |
| `GET` `POST` | `/api/clientes` | Listar / agregar |
| `GET` | `/api/clientes/dni/:dni` | Buscar por DNI (usado en `RegistrarVenta`) |
| `GET` `PUT` `DELETE` | `/api/clientes/:id` | Detalle / actualizar / eliminar |
| `GET` `POST` | `/api/productos` | Listar / agregar |
| `GET` `PUT` `DELETE` | `/api/productos/:id` | Detalle / actualizar / eliminar |
| `GET` | `/api/ventas/serie` | Siguiente número de serie (8 dígitos) |
| `GET` `POST` | `/api/ventas` | Listar / registrar venta con sus detalles |
| `GET` | `/api/ventas/:id` | Venta con su detalle |

Todas las rutas salvo `auth/login` y `salud` exigen `Authorization: Bearer <token>`
(sesión de 30 minutos, el mismo `session-timeout` del `web.xml` original).
