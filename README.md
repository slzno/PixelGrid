# PrixelGrid

Navegador multipanel para previsualizar y probar sitios web en varios dispositivos a la vez.

**Creado por [Pagorium Technologies](https://pagorium.com)**

## Características

- Varios viewports sincronizados (móvil, tableta, portátil, escritorio)
- Mockups de dispositivos Space Gray / Silver
- Capturas del viewport a alta resolución
- Tema claro y oscuro de la aplicación
- Herramientas de desarrollo embebidas por panel

## Desarrollo

```bash
npm install
npm run dev
```

## Build y distribución

```bash
# Empaquetar sin publicar
npm run dist

# Por plataforma
npm run dist:mac
npm run dist:win
npm run dist:linux

# Carpeta sin instalador
npm run pack

# Publicar release (requiere GH_TOKEN / GitHub)
npm run release
```

Los artefactos quedan en `release/<versión>/`.

## Metadatos

| Campo | Valor |
| --- | --- |
| Producto | PrixelGrid |
| App ID | `com.pagorium.prixelgrid` |
| Autor | Pagorium Technologies |
| Sitio | https://pagorium.com |
| Contacto | hello@pagorium.com |

## Iconos

- `build/icon.png` — maestro 1024×1024
- `build/icon.icns` — macOS
- `build/icon.ico` — Windows
- `public/prixelgrid.svg` / `public/icons/*` — favicon y web

## Licencia

Software propietario de Pagorium Technologies. Ver `LICENSE`.
