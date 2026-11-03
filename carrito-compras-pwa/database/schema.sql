CREATE TABLE IF NOT EXISTS cliente (
  idCliente INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Dni VARCHAR(9) NULL,
  Nombres VARCHAR(255) NOT NULL,
  Direccion VARCHAR(255) NOT NULL,
  Email VARCHAR(254) NOT NULL,
  Password VARCHAR(255) NULL,
  PRIMARY KEY (idCliente),
  KEY idx_cliente_email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pago (
  idPago INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Monto DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (idPago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS producto (
  idProducto INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Nombres VARCHAR(255) NOT NULL,
  Foto LONGBLOB NULL,
  Descripcion VARCHAR(255) NULL,
  Precio DECIMAL(10, 2) NOT NULL,
  Stock INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (idProducto),
  KEY idx_producto_stock (Stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS compras (
  idCompras INT UNSIGNED NOT NULL AUTO_INCREMENT,
  idCliente INT UNSIGNED NOT NULL,
  idPago INT UNSIGNED NOT NULL,
  FechaCompras DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Monto DECIMAL(10, 2) NOT NULL,
  Estado VARCHAR(50) NOT NULL DEFAULT 'Pendiente de pago',
  PRIMARY KEY (idCompras),
  KEY idx_compras_cliente (idCliente),
  KEY idx_compras_pago (idPago),
  CONSTRAINT fk_compras_cliente FOREIGN KEY (idCliente) REFERENCES cliente (idCliente),
  CONSTRAINT fk_compras_pago FOREIGN KEY (idPago) REFERENCES pago (idPago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_compras (
  idDetalle INT UNSIGNED NOT NULL AUTO_INCREMENT,
  idProducto INT UNSIGNED NOT NULL,
  idCompras INT UNSIGNED NOT NULL,
  Cantidad INT UNSIGNED NOT NULL,
  PrecioCompra DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (idDetalle, idProducto, idCompras),
  KEY idx_detalle_producto (idProducto),
  KEY idx_detalle_compra (idCompras),
  CONSTRAINT fk_detalle_producto FOREIGN KEY (idProducto) REFERENCES producto (idProducto),
  CONSTRAINT fk_detalle_compra FOREIGN KEY (idCompras) REFERENCES compras (idCompras)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
