const APP_VERSION = '1.1.0';
const CART_STORAGE_KEY = 'mi-empresa-store-cart-v1';
const PRODUCTS_STORAGE_KEY = 'mi-empresa-store-products-v1';
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

const elements = {
  grid: document.querySelector('#product-grid'),
  notice: document.querySelector('#catalog-notice'),
  empty: document.querySelector('#empty-state'),
  search: document.querySelector('#product-search'),
  cartDialog: document.querySelector('#cart-dialog'),
  cartItems: document.querySelector('#cart-items'),
  cartEmpty: document.querySelector('#cart-empty'),
  cartSubtotal: document.querySelector('#cart-subtotal'),
  cartCount: document.querySelector('#cart-count'),
  cartMessage: document.querySelector('#cart-message'),
  checkoutForm: document.querySelector('#checkout-form'),
  checkoutButton: document.querySelector('#checkout-button'),
  installButton: document.querySelector('#install-app'),
  installDialog: document.querySelector('#install-dialog'),
  installInstructions: document.querySelector('#install-instructions'),
  updateNotice: document.querySelector('#update-notice'),
  updateButton: document.querySelector('#update-button')
};

let products = [];
let cart = readCart();
let activeFilter = 'all';
let serviceWorkerRegistration;
let deferredInstallPrompt;

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

function updateInstallButton() {
  const installed = isAppInstalled();
  elements.installButton.disabled = installed;
  elements.installButton.classList.toggle('is-installed', installed);
  elements.installButton.querySelector('.install-label').textContent = installed ? 'App instalada' : 'Instalar app';
  elements.installButton.setAttribute('aria-label', installed ? 'Mi Empresa Store ya está instalada' : 'Instalar Mi Empresa Store');
  elements.installButton.title = installed ? 'Mi Empresa Store ya está instalada' : 'Instalar Mi Empresa Store';
}

function showInstallInstructions() {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  elements.installInstructions.textContent = isAppleMobile
    ? 'En Safari, toca Compartir y elige «Añadir a pantalla de inicio». Luego toca «Añadir» para instalar la tienda.'
    : 'Abre el menú de tu navegador y elige «Instalar aplicación» o «Añadir a pantalla de inicio». En Chrome para computadora, también puedes usar el icono de instalación junto a la dirección del sitio.';
  elements.installDialog.showModal();
}

async function installApp() {
  if (isAppInstalled()) {
    updateInstallButton();
    return;
  }

  if (!deferredInstallPrompt) {
    showInstallInstructions();
    return;
  }

  const installPrompt = deferredInstallPrompt;
  deferredInstallPrompt = undefined;
  try {
    await installPrompt.prompt();
    await installPrompt.userChoice;
  } catch (error) {
    console.error('No se pudo abrir la opción de instalación del navegador.', error);
    showInstallInstructions();
  }
}

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`No se pudo leer el almacenamiento local (${key}).`, error);
    return fallback;
  }
}

function readCart() {
  const stored = readStoredJson(CART_STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((item) =>
    Number.isInteger(item.idProducto) && item.idProducto > 0 &&
    Number.isInteger(item.cantidad) && item.cantidad > 0
  );
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    showCartMessage('No se pudo guardar el carrito en este dispositivo.', true);
    console.error('No se pudo guardar el carrito.', error);
  }
}

function showNotice(message, isError = false) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle('is-error', isError);
  elements.notice.hidden = !message;
}

function showCartMessage(message, isError = false) {
  elements.cartMessage.textContent = message;
  elements.cartMessage.classList.toggle('is-error', isError);
}

async function readApiJson(response) {
  try {
    const result = await response.json();
    if (!result || typeof result !== 'object') throw new Error('invalid response');
    return result;
  } catch {
    throw new Error('El servidor no devolvió una respuesta válida. Verifica que las funciones API estén desplegadas.');
  }
}

function productImage(product, className = 'product-image') {
  const isEmbeddedImage = typeof product.foto === 'string' && /^data:image\/(?:jpeg|png|gif|webp);base64,/i.test(product.foto);
  const isStoreImage = typeof product.foto === 'string' && /^\/api\/product-image\?id=\d+$/.test(product.foto);
  if (isEmbeddedImage || isStoreImage) {
    const image = document.createElement('img');
    image.className = className;
    image.src = product.foto;
    image.alt = product.nombres;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(makePlaceholder()), { once: true });
    return image;
  }
  return makePlaceholder(className);
}

function makePlaceholder(className = 'product-placeholder') {
  const placeholder = document.createElement('div');
  placeholder.className = className === 'product-image' ? 'product-placeholder' : className;
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.textContent = '✳';
  return placeholder;
}

function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'product-image-wrap';
  imageWrap.append(productImage(product));

  const stockBadge = document.createElement('span');
  stockBadge.className = `stock-badge${product.stock > 0 ? '' : ' out-of-stock'}`;
  stockBadge.textContent = product.stock > 0 ? `${product.stock} disponibles` : 'Agotado';
  imageWrap.append(stockBadge);

  const info = document.createElement('div');
  info.className = 'product-info';

  const category = document.createElement('p');
  category.className = 'product-category';
  category.textContent = 'Selección de tienda';

  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.nombres;

  const description = document.createElement('p');
  description.className = 'product-description';
  description.textContent = product.descripcion || 'Un favorito de nuestra tienda.';

  const bottom = document.createElement('div');
  bottom.className = 'product-bottom';

  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = money.format(product.precio);

  const addButton = document.createElement('button');
  addButton.className = 'add-button';
  addButton.type = 'button';
  addButton.textContent = product.stock > 0 ? 'Agregar al carrito +' : 'Sin stock';
  addButton.disabled = product.stock < 1;
  addButton.addEventListener('click', () => addToCart(product.idProducto));

  bottom.append(price, addButton);
  info.append(category, name, description, bottom);
  card.append(imageWrap, info);
  return card;
}

function renderProducts() {
  const query = elements.search.value.trim().toLocaleLowerCase('es');
  const visibleProducts = products.filter((product) => {
    const matchesQuery = `${product.nombres} ${product.descripcion || ''}`.toLocaleLowerCase('es').includes(query);
    return matchesQuery && (activeFilter === 'all' || product.stock > 0);
  });

  elements.grid.replaceChildren(...visibleProducts.map(createProductCard));
  elements.grid.setAttribute('aria-busy', 'false');
  elements.empty.hidden = visibleProducts.length > 0 || products.length === 0;
  if (products.length === 0) elements.grid.replaceChildren();
}

async function loadProducts() {
  elements.grid.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/products', { headers: { Accept: 'application/json' } });
    const result = await readApiJson(response);
    if (!response.ok) throw new Error(result.message || 'No se pudo cargar el catálogo.');
    if (!Array.isArray(result.products)) throw new Error('La respuesta del catálogo no es válida.');
    products = result.products;
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch (error) {
      console.warn('No se pudo guardar una copia local del catálogo.', error);
    }
    showNotice('');
  } catch (error) {
    const cachedProducts = readStoredJson(PRODUCTS_STORAGE_KEY, []);
    if (Array.isArray(cachedProducts) && cachedProducts.length) {
      products = cachedProducts;
      showNotice('No hay conexión con la tienda. Mostramos el último catálogo guardado; los pedidos requieren conexión.', true);
    } else {
      products = [];
      showNotice(`${error.message} Revisa tu conexión o la configuración de la base de datos.`, true);
    }
  }
  renderProducts();
  renderCart();
}

function addToCart(productId, openCart = false) {
  const product = products.find((item) => item.idProducto === productId);
  if (!product || product.stock < 1) return;
  const item = cart.find((entry) => entry.idProducto === productId);
  if (item) {
    if (item.cantidad >= product.stock) {
      showCartMessage('Ya agregaste todas las unidades disponibles de este producto.', true);
      if (!elements.cartDialog.open) elements.cartDialog.showModal();
      return;
    }
    item.cantidad += 1;
  } else {
    cart.push({ idProducto: productId, cantidad: 1 });
  }
  saveCart();
  renderCart();
  showCartMessage('');
  if (openCart && !elements.cartDialog.open) elements.cartDialog.showModal();
}

function updateQuantity(productId, delta) {
  const item = cart.find((entry) => entry.idProducto === productId);
  const product = products.find((entry) => entry.idProducto === productId);
  if (!item || !product) return;
  const quantity = item.cantidad + delta;
  if (quantity < 1) {
    cart = cart.filter((entry) => entry.idProducto !== productId);
  } else if (quantity <= product.stock) {
    item.cantidad = quantity;
  } else {
    showCartMessage('No hay más unidades disponibles.', true);
  }
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.idProducto !== productId);
  saveCart();
  renderCart();
}

function renderCart() {
  const validItems = cart.map((item) => ({
    ...item,
    product: products.find((product) => product.idProducto === item.idProducto)
  })).filter((item) => item.product);
  const count = validItems.reduce((sum, item) => sum + item.cantidad, 0);
  const subtotal = validItems.reduce((sum, item) => sum + item.product.precio * item.cantidad, 0);

  elements.cartCount.textContent = String(count);
  elements.cartItems.replaceChildren(...validItems.map((item) => {
    const row = document.createElement('div');
    row.className = 'cart-line';
    row.append(productImage(item.product, 'cart-thumb'));

    const details = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'cart-line-name';
    name.textContent = item.product.nombres;
    const price = document.createElement('span');
    price.className = 'cart-line-price';
    price.textContent = money.format(item.product.precio);
    const controls = document.createElement('div');
    controls.className = 'quantity-control';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Reducir cantidad de ${item.product.nombres}`);
    minus.addEventListener('click', () => updateQuantity(item.idProducto, -1));
    const quantity = document.createElement('span');
    quantity.textContent = String(item.cantidad);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Aumentar cantidad de ${item.product.nombres}`);
    plus.disabled = item.cantidad >= item.product.stock;
    plus.addEventListener('click', () => updateQuantity(item.idProducto, 1));
    controls.append(minus, quantity, plus);
    details.append(name, price, controls);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-item';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Quitar ${item.product.nombres} del carrito`);
    remove.addEventListener('click', () => removeFromCart(item.idProducto));
    row.append(details, remove);
    return row;
  }));
  elements.cartEmpty.hidden = validItems.length > 0;
  elements.cartSubtotal.textContent = money.format(subtotal);
  elements.checkoutButton.disabled = validItems.length === 0;
}

async function submitOrder(event) {
  event.preventDefault();
  if (!cart.length || elements.checkoutButton.disabled) return;

  const formData = new FormData(elements.checkoutForm);
  const payload = {
    nombres: formData.get('nombres'),
    email: formData.get('email'),
    direccion: formData.get('direccion'),
    dni: formData.get('dni'),
    items: cart.map(({ idProducto, cantidad }) => ({ idProducto, cantidad }))
  };

  elements.checkoutButton.disabled = true;
  elements.checkoutButton.textContent = 'Registrando pedido…';
  showCartMessage('');
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await readApiJson(response);
    if (!response.ok) throw new Error(result.message || 'No se pudo registrar el pedido.');

    cart = [];
    saveCart();
    renderCart();
    elements.checkoutForm.reset();
    showCartMessage(`¡Listo! Tu pedido #${result.orderId} quedó registrado y está pendiente de pago.`);
    await loadProducts();
  } catch (error) {
    showCartMessage(error.message, true);
  } finally {
    elements.checkoutButton.textContent = 'Registrar pedido →';
    elements.checkoutButton.disabled = cart.length === 0;
  }
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      serviceWorkerRegistration = registration;
      if (registration.waiting) showUpdateNotice();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateNotice();
        });
      });
      registration.update().catch((error) => console.warn('No se pudo comprobar si hay una actualización.', error));
      window.addEventListener('focus', () => {
        registration.update().catch((error) => console.warn('No se pudo comprobar si hay una actualización.', error));
      });
    })
    .catch((error) => console.error('No se pudo registrar el modo PWA.', error));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.location.reload();
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = undefined;
  updateInstallButton();
});

function showUpdateNotice() {
  elements.updateNotice.hidden = false;
}

elements.search.addEventListener('input', renderProducts);
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((filterButton) => {
      const active = filterButton === button;
      filterButton.classList.toggle('is-active', active);
      filterButton.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  });
});
document.querySelector('#open-cart').addEventListener('click', () => elements.cartDialog.showModal());
document.querySelector('#close-cart').addEventListener('click', () => elements.cartDialog.close());
elements.installButton.addEventListener('click', installApp);
document.querySelector('#close-install').addEventListener('click', () => elements.installDialog.close());
document.querySelector('#install-understood').addEventListener('click', () => elements.installDialog.close());
elements.installDialog.addEventListener('click', (event) => {
  if (event.target === elements.installDialog) elements.installDialog.close();
});
elements.cartDialog.addEventListener('click', (event) => {
  if (event.target === elements.cartDialog) elements.cartDialog.close();
});
elements.checkoutForm.addEventListener('submit', submitOrder);
elements.updateButton.addEventListener('click', () => {
  if (!serviceWorkerRegistration?.waiting) return;
  serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
});
document.querySelector('#app-version').textContent = APP_VERSION;
updateInstallButton();

renderCart();
loadProducts();
setupServiceWorker();
