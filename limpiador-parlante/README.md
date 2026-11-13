# Limpia Parlante

Aplicacion Flutter para Android que genera tonos localmente y los reproduce
por el altavoz del telefono. No solicita permisos ni descarga audio.

## Funciones

- Barrido senoidal de 165 a 230 Hz durante 30 segundos.
- Generador manual de 50 Hz a 2 kHz con formas de onda senoidal, cuadrada,
  triangular y diente de sierra.
- Control para detener la reproduccion; el audio se detiene al salir de la app.
- Generacion de audio PCM WAV en memoria, sin archivos de audio incluidos.

Los tonos no garantizan expulsar agua o suciedad. Usa un volumen comodo y
deten la reproduccion si escuchas distorsion o notas molestia. Si el telefono
se mojo, sigue las indicaciones del fabricante.

## Ejecutar en Android

Desde esta carpeta, con Flutter y el Android SDK configurados:

```powershell
flutter pub get
flutter run
```

Para generar un APK de lanzamiento:

```powershell
flutter build apk --release
```

El APK se guarda en
`build/app/outputs/flutter-apk/app-release.apk`.

## Pagina de descarga en Vercel

Esta carpeta tambien incluye `index.html` y `vercel.json`. Copia el APK
compilado como `app-release.apk` junto a `index.html` y despliega esta carpeta
como un proyecto estatico de Vercel, sin comando de compilacion.

El QR de descarga se genera con la URL publica asignada al proyecto y se
guarda como `qr.png` junto a la pagina.
