# Family Roadbook

PWA mobile-first para consultar un roadbook familiar de carretera. La V1 cubre el corredor Madrid → Castro Urdiales del 10 de agosto de 2026 y complementa a Google Maps: muestra las próximas opciones de parada, pero no calcula rutas, tráfico ni navegación.

> [!WARNING]
> El dataset actual es **provisional**. Los candidatos proceden de la issue #1, pero sus ubicaciones exactas, sentidos, accesos y servicios todavía requieren verificación independiente. La interfaz muestra esos campos como provisionales o desconocidos y no confirma ningún servicio.

## Stack y arquitectura

- Vue 3 + Vite + JavaScript.
- Una sola vista, sin router, backend, autenticación ni gestor de estado.
- Datos estáticos en `src/data/trips/madrid-castro-2026.json`.
- Progreso independiente por viaje guardado en `localStorage`.
- Service worker y manifest generados con `vite-plugin-pwa`.
- Tests de la lógica pura con el runner integrado de Node.js.

La función de próximas paradas descarta los IDs ya superados, ordena el resto por `routeOrder` y devuelve hasta tres. No usa geolocalización. El orden representa únicamente la secuencia del corredor, no una distancia en tiempo real ni una recomendación basada en servicios.

## Desarrollo

Requiere Node.js 20.19 o posterior (o cualquier versión desde la 22.12), de acuerdo con los requisitos de Vite.

```bash
npm install
npm run dev
```

Vite mostrará la URL local. Para probar desde otro dispositivo de la misma red se puede ejecutar `npm run dev -- --host` y abrir la IP indicada, teniendo en cuenta que algunas funciones PWA requieren HTTPS o `localhost`.

## Validación y build

```bash
npm test
npm run build
npm run preview
```

El build de producción se escribe en `dist/`. La PWA precachea el shell, los iconos y los assets generados. Como el JSON se importa en el bundle, el roadbook principal queda incluido en el precache y vuelve a abrir después de una primera carga online. Google Maps es externo y puede requerir conexión.

Para comprobar el modo offline manualmente:

1. Ejecutar el build y `npm run preview`.
2. Abrir la app una vez con conexión y esperar al registro del service worker.
3. Activar el modo offline en las herramientas del navegador y recargar.
4. Confirmar que el roadbook aparece y que se muestra el indicador discreto “Sin conexión”.

## Despliegue en Vercel

1. Importar este repositorio en Vercel.
2. Seleccionar **Vite** como framework (normalmente se detecta automáticamente).
3. Usar `npm run build` como Build Command y `dist` como Output Directory.
4. Desplegar sin variables de entorno: esta V1 no necesita ninguna.

Al ser una sola vista sin rutas de cliente, no hace falta configuración adicional de rewrites ni SDK de Vercel.

## Datos de viajes futuros

Cada fichero de viaje tiene un ID estable, metadatos de ruta, un destino separado y una lista ordenada que contiene únicamente áreas de parada. Los servicios admiten `true`, `false` o `"unknown"`; los datos de distancia, carretera, sentido y ubicación incluyen su propio estado. Para añadir otra ruta se puede crear otro JSON con el mismo `schemaVersion` y reutilizar la UI sin cambiar el modelo.

No deben añadirse nombres de menores, matrículas, domicilios, secretos ni otros datos privados.
