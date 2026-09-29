-- ============================================================================
--  Sistema de Ventas Web — base de datos `db_ventas`
--  Réplica en TypeScript del proyecto Java (NetBeans 8.2 / GlassFish).
--  Mismas tablas, columnas y datos que el dump original `trinidad.sql`.
--
--  Cargar:   mysql -u root -p < db/db_ventas.sql
--  o bien:   npm run db:reset
--
--  Usuarios de prueba (contraseña de todos: 123456)
--    emp01 / Jo46 / Em22
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `db_ventas`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `db_ventas`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `sesiones`;
DROP TABLE IF EXISTS `detalle_ventas`;
DROP TABLE IF EXISTS `ventas`;
DROP TABLE IF EXISTS `producto`;
DROP TABLE IF EXISTS `cliente`;
DROP TABLE IF EXISTS `empleado`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE `empleado` (
  `IdEmpleado` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `Dni`        VARCHAR(8)   NOT NULL,
  `Nombres`    VARCHAR(255) DEFAULT NULL,
  `Telefono`   VARCHAR(9)   DEFAULT NULL,
  `Estado`     VARCHAR(1)   DEFAULT NULL,
  `User`       VARCHAR(8)   DEFAULT NULL,
  -- Única diferencia respecto del modelo Java: el login original comparaba el
  -- DNI como contraseña. Aquí la contraseña se guarda con hash bcrypt.
  `Password`   VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`IdEmpleado`),
  UNIQUE KEY `uq_empleado_user` (`User`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `sesiones` (
  `Token`      CHAR(36)      NOT NULL,
  `IdEmpleado` INT UNSIGNED NOT NULL,
  `Expira`     DATETIME      NOT NULL,
  PRIMARY KEY (`Token`),
  KEY `idx_sesiones_expira` (`Expira`),
  KEY `idx_sesiones_empleado` (`IdEmpleado`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `cliente` (
  `IdCliente` INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `Dni`       VARCHAR(8)    DEFAULT NULL,
  `Nombres`   VARCHAR(244)  DEFAULT NULL,
  `Direccion` VARCHAR(244)  DEFAULT NULL,
  `Estado`    VARCHAR(1)    DEFAULT NULL,
  PRIMARY KEY (`IdCliente`),
  KEY `idx_cliente_dni` (`Dni`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `producto` (
  `IdProducto` INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `Nombres`    VARCHAR(244)  DEFAULT NULL,
  `Precio`     DOUBLE        DEFAULT NULL,
  `Stock`      INT UNSIGNED  DEFAULT NULL,
  `Estado`     VARCHAR(1)    DEFAULT NULL,
  PRIMARY KEY (`IdProducto`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `ventas` (
  `IdVentas`    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `IdCliente`   INT UNSIGNED  NOT NULL,
  `IdEmpleado`  INT UNSIGNED  NOT NULL,
  `NumeroSerie` VARCHAR(8)    DEFAULT NULL COMMENT 'Serie correlativa de 8 dígitos',
  `FechaVentas` DATE          DEFAULT NULL,
  `Monto`       DOUBLE        DEFAULT NULL,
  `Estado`      VARCHAR(1)    DEFAULT NULL,
  PRIMARY KEY (`IdVentas`),
  UNIQUE KEY `uq_ventas_serie` (`NumeroSerie`),
  KEY `Ventas_FKIndex1` (`IdEmpleado`),
  KEY `Ventas_FKIndex2` (`IdCliente`),
  CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`IdEmpleado`) REFERENCES `empleado` (`IdEmpleado`),
  CONSTRAINT `ventas_ibfk_2` FOREIGN KEY (`IdCliente`)  REFERENCES `cliente`  (`IdCliente`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `detalle_ventas` (
  `IdDetalleVentas` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `IdVentas`        INT UNSIGNED NOT NULL,
  `IdProducto`      INT UNSIGNED NOT NULL,
  `Cantidad`        INT UNSIGNED DEFAULT NULL,
  `PrecioVenta`     DOUBLE        DEFAULT NULL,
  PRIMARY KEY (`IdDetalleVentas`),
  KEY `Ventas_has_Producto_FKIndex1` (`IdVentas`),
  KEY `Ventas_has_Producto_FKIndex2` (`IdProducto`),
  CONSTRAINT `detalle_ventas_ibfk_1` FOREIGN KEY (`IdVentas`)   REFERENCES `ventas`   (`IdVentas`),
  CONSTRAINT `detalle_ventas_ibfk_2` FOREIGN KEY (`IdProducto`) REFERENCES `producto` (`IdProducto`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Datos iniciales (idénticos a `trinidad.sql`)
-- Password de todos: 123456  (hash bcrypt)
-- ---------------------------------------------------------------------------

INSERT INTO `empleado` (`IdEmpleado`, `Dni`, `Nombres`, `Telefono`, `Estado`, `User`, `Password`) VALUES
(1, '123', 'Pedro Hernandez', '988252459', '1', 'emp01', '$2b$10$2IljA47uywpNSMDSGS9VKu7lWSnN3/kpA9Rgq1Nylzcr8tgUg2wK6'),
(2, '123', 'Roman Riquelme',  '988252459', '1', 'Jo46',  '$2b$10$2IljA47uywpNSMDSGS9VKu7lWSnN3/kpA9Rgq1Nylzcr8tgUg2wK6'),
(3, '123', 'Palermo Suarez',  '453536458', '1', 'Em22',  '$2b$10$2IljA47uywpNSMDSGS9VKu7lWSnN3/kpA9Rgq1Nylzcr8tgUg2wK6');

INSERT INTO `cliente` (`IdCliente`, `Dni`, `Nombres`, `Direccion`, `Estado`) VALUES
(17, '2', 'Juan Guerrero Solis',       'Los Alamos',            '1'),
(18, '1', 'Maria Rosas Villanueva',    'Los Laureles 234',       '1'),
(19, '3', 'Andres de Santa Cruz',      'Av. La Frontera 347',    '1'),
(20, '4', 'Andres Mendoza',            'Chosica, Lurigancho',   '1');

INSERT INTO `producto` (`IdProducto`, `Nombres`, `Precio`, `Stock`, `Estado`) VALUES
(1, 'Teclado Logitech 345 Editado', 150,  99, '1'),
(2, 'Mouse Logitech 567',           20,  98, '1'),
(3, 'Laptop Lenovo Ideapad 520',   800, 100, '1'),
(4, 'HeadPhones Sony M333',         500,  98, '1'),
(7, 'Producto Nuevo w',             22,  35, '1');
