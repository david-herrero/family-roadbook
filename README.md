# Family Roadbook

PWA mobile-first que funciona como biblioteca de roadbooks familiares de carretera. Los trayectos se pueden consultar desde “Mis roadbooks” y, una vez abiertos, muestran las próximas opciones de parada. La aplicación complementa a Google Maps: no calcula rutas, tráfico ni navegación en tiempo real.

> [!WARNING]
> El dataset de ida conserva sus diez áreas sin cambios. El de vuelta contiene once opciones contrastadas con las fuentes indicadas en la issue #7. Solo se marcan como confirmados los servicios respaldados por esas fuentes; el resto permanece como `unknown` o provisional. Todas las distancias acumuladas siguen siendo desconocidas. En Briviesca se usa el PK 36 de la ficha institucional; la ubicación permanece provisional porque la ficha de Areas muestra el PK 12 discrepante.

## Stack y arquitectura

- Vue 3 + Vite + JavaScript.
- Una sola vista, sin router, backend, autenticación ni gestor de estado.
- Viajes definidos como datasets JSON estáticos bajo `src/data/trips/`.
- Colecciones y orden centralizados en `src/data/catalog.js`, que importa los datasets sin duplicarlos.
- Biblioteca accesible y selector de trayectos generado desde cada colección.
- Selección automática global: viaje del día local, futuro más cercano o, si todos han pasado, el último.
- Progreso independiente por viaje guardado en `localStorage`.
- Service worker y manifest generados con `vite-plugin-pwa`.
- Tests de la lógica pura con el runner integrado de Node.js.

La función de próximas paradas descarta destinos, periodos de cierre que incluyan la fecha del viaje e IDs ya superados; después ordena el resto por `routeOrder` y devuelve hasta tres. No usa geolocalización. El orden representa únicamente la secuencia del corredor, no una distancia en tiempo real.

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

El build de producción se escribe en `dist/`. La PWA precachea el shell, los iconos y los assets generados. Los JSON importados estáticamente por el catálogo quedan incluidos en el bundle y vuelven a abrir desde la biblioteca después de una primera carga online. Google Maps es externo y puede requerir conexión.

Para comprobar el modo offline manualmente:

1. Ejecutar el build y `npm run preview`.
2. Abrir la app una vez con conexión y esperar al registro del service worker.
3. Activar el modo offline en las herramientas del navegador y recargar.
4. Confirmar que se puede abrir la biblioteca, entrar en cualquier trayecto catalogado y cambiar entre ellos, y que se muestra el indicador discreto “Sin conexión”.

## Despliegue en Vercel

1. Importar este repositorio en Vercel.
2. Seleccionar **Vite** como framework (normalmente se detecta automáticamente).
3. Usar `npm run build` como Build Command y `dist` como Output Directory.
4. Desplegar sin variables de entorno: esta V1 no necesita ninguna.

Al ser una sola vista sin rutas de cliente, no hace falta configuración adicional de rewrites ni SDK de Vercel.

## Datos de viajes futuros

Cada fichero de viaje tiene un ID estable, metadatos de ruta, un destino separado y una lista ordenada que contiene únicamente áreas de parada. Los servicios admiten `true`, `false` o `"unknown"`; los datos de distancia, carretera, sentido y ubicación incluyen su propio estado. El selector también admite periodos opcionales `availability.closedPeriods` con fechas inclusivas. Para incorporar una colección futura se añaden/importan sus datasets en el catálogo; la biblioteca y la selección automática consumen esa única fuente de agrupación.

No deben añadirse nombres de menores, matrículas, domicilios, secretos ni otros datos privados.
