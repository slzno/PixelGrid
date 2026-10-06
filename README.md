# PixelGrid

**PixelGrid** es una aplicación de escritorio de [Pagorium Technologies](https://pagorium.com) para **diseñar, revisar y probar sitios web en varios tamaños de pantalla a la vez**.

En lugar de abrir el sitio en un solo navegador y cambiar el ancho a mano, PixelGrid muestra la misma URL en varios paneles (móvil, tableta, portátil, escritorio) con el viewport real de cada dispositivo. Así puedes comparar layouts responsive, detectar roturas de diseño y validar la experiencia en distintos formatos sin salir de una sola ventana.

## ¿Para qué sirve?

- Ver cómo se comporta tu sitio en iPhone, Android, iPad, MacBook y escritorios al mismo tiempo
- Navegar con scroll y clics sincronizados entre paneles
- Capturar el viewport (no la página completa) en calidad nítida (hasta 4K)
- Abrir las herramientas de desarrollo del panel activo sin perder el resto de vista previa
- Presentar el diseño con mockups de dispositivo (opcionales) en tema claro u oscuro

## Características principales

| Área | Qué hace |
| --- | --- |
| **Multipanel** | Varios viewports lado a lado, en columna o en modo enfoque |
| **Dispositivos** | Presets de iOS, Android, Xiaomi/Redmi/POCO, iPad, portátiles y escritorios |
| **Sincronización** | Scroll y navegación alineados entre paneles |
| **Mockups** | Marcos Space Gray / Silver; se pueden activar o desactivar |
| **Capturas** | PNG del viewport visible, con export a 1080p / 2K / 4K |
| **DevTools** | Consola e inspección embebidas en la app, por panel |
| **Tema** | Interfaz clara u oscura (solo el chrome de PixelGrid, no la página) |

## Stack

- Electron
- React + TypeScript
- Vite
- Tailwind CSS + componentes estilo shadcn

## Requisitos

- Node.js 18+ recomendado
- macOS, Windows o Linux

## Desarrollo

```bash
npm install
npm run dev
```

La URL por defecto apunta a [pagorium.com](https://pagorium.com/). Puedes cambiarla desde la barra de dirección.

## Build y distribución

```bash
# Empaquetar sin publicar
npm run dist

# Por plataforma
npm run dist:mac
npm run dist:win
npm run dist:linux

# Carpeta sin instalador (prueba local)
npm run pack

# Publicar release (requiere GH_TOKEN y repo configurado)
npm run release
```

Los instaladores y artefactos se generan en `release/<versión>/`.

## Metadatos del producto

| Campo | Valor |
| --- | --- |
| Producto | PixelGrid |
| App ID | `com.pagorium.pixelgrid` |
| Autor | Pagorium Technologies |
| Sitio | https://pagorium.com |
| Contacto | hello@pagorium.com |

## Iconos

- `build/icon.png` — maestro 1024×1024 (esquinas redondeadas)
- `build/icon.icns` — macOS
- `build/icon.ico` — Windows
- `public/pixelgrid.svg` y `public/icons/*` — favicon y assets web

## Licencia

Software propietario de Pagorium Technologies. Ver `LICENSE`.
