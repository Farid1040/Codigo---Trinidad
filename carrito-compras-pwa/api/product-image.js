const { getPool, sendJson, sendDatabaseError } = require('./_db');

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return sendJson(response, 405, { message: 'Método no permitido.' });
  }

  const rawId = request.query?.id;
  const id = typeof rawId === 'string' && /^\d{1,10}$/.test(rawId) ? Number(rawId) : 0;
  if (!Number.isSafeInteger(id) || id < 1) return sendJson(response, 400, { message: 'El identificador del producto no es válido.' });

  try {
    const [rows] = await getPool().execute(
      'SELECT Foto FROM producto WHERE idProducto = ? LIMIT 1',
      [id]
    );
    if (!rows.length || !rows[0].Foto) return sendJson(response, 404, { message: 'El producto no tiene una imagen.' });

    const image = rows[0].Foto;
    if (image.length > 3 * 1024 * 1024) return sendJson(response, 413, { message: 'La imagen del producto supera el tamaño permitido.' });
    const contentType = detectImageType(image);
    if (!contentType) return sendJson(response, 415, { message: 'El formato de la imagen no es compatible.' });

    response.status(200);
    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Length', String(image.length));
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return response.end(image);
  } catch (error) {
    return sendDatabaseError(response, error);
  }
};
