# PatriaPaint

PatriaPaint es una aplicación web interactiva hecha con Vite y Babylon.js que permite pintar graffiti directamente sobre estatuas 3D desde el navegador.

El proyecto actualmente funciona en modo local y también incluye un modo colaborativo opcional con Socket.IO, para que varias sesiones del navegador puedan pintar sobre la misma estatua en tiempo real.

## Funcionalidades

* Escena 3D interactiva construida con Babylon.js.
* Pintura estilo aerosol sobre modelos 3D de estatuas.
* Modo local: permite pintar en el navegador sin levantar servidor colaborativo.
* Modo colaborativo: varios usuarios pueden entrar a la misma sala de estatua y ver los graffitis en tiempo real.
* Estado compartido por estatua.
* Opción para limpiar los graffitis de cada estatua.
* Límite de decals en el servidor para evitar crecimiento indefinido de memoria.
* Flujo de desarrollo con Vite.

## Inicio rápido

Instalar dependencias:

```bash
npm install
```

Correr la aplicación localmente:

```bash
npm run dev
```

Abrir la URL que aparece en la terminal. Normalmente es:

```text
http://localhost:5173
```

## Usar el modo colaborativo

Para correr la aplicación web y el servidor de Socket.IO al mismo tiempo:

```bash
npm run dev:all
```

Luego abrir:

```text
http://localhost:5173
```

Dentro de la aplicación, activar:

```text
Modo colaborativo
```

Para probar la colaboración localmente:

1. Abrir dos ventanas del navegador con la misma URL.
2. Activar el modo colaborativo en ambas.
3. Seleccionar la misma estatua.
4. Pintar en una ventana y verificar que la otra reciba los decals.

## Servidor

El servidor colaborativo está en:

```text
server/index.js
```

Por defecto escucha en:

```text
http://127.0.0.1:3001
```

Se puede cambiar el host y el puerto usando variables de entorno:

```bash
SOCKET_HOST=0.0.0.0 SOCKET_PORT=3001 npm run server
```

El servidor guarda el estado de cada sala en memoria, agrupado por ID de estatua. Actualmente almacena hasta 2000 decals por estatua.

## Configuración del cliente Socket.IO

El módulo de colaboración del cliente está en:

```text
src/network/collaboration.js
```

Por defecto, el cliente se conecta a:

```text
http://localhost:3001
```

Se puede cambiar creando un archivo `.env`:

```bash
VITE_SOCKET_URL=http://localhost:3001
```

Para probar en red local, usar la IP de la máquina host:

```bash
VITE_SOCKET_URL=http://192.168.x.x:3001
```

Luego correr:

```bash
npm run dev:all
```

## Scripts disponibles

```bash
npm run dev
```

Corre el servidor de desarrollo de Vite.

```bash
npm run server
```

Corre el servidor colaborativo de Socket.IO.

```bash
npm run dev:all
```

Corre al mismo tiempo el servidor de Socket.IO y la aplicación Vite.

```bash
npm run build
```

Genera la versión de producción.

```bash
npm run preview
```

Previsualiza localmente la versión de producción.

## Estructura del proyecto

```text
PatriaPaint/
├── index.html
├── package.json
├── README.md
├── public/
│   └── models/
├── server/
│   └── index.js
└── src/
    ├── main.js
    ├── styles.css
    ├── network/
    │   └── collaboration.js
    ├── scene/
    └── ui/
```

## Tecnologías

* Vite
* Babylon.js
* Socket.IO
* JavaScript
* HTML/CSS

## Demo pública

La versión web estática puede publicarse con GitHub Pages en:

```text
https://octx-xtco.github.io/PatriaPaint/
```

Esta demo sirve para abrir la aplicación como frontend estático.

El modo colaborativo con Socket.IO requiere un servidor Node aparte, por lo que no funciona únicamente con GitHub Pages.

## Notas

El estado colaborativo se guarda actualmente en memoria dentro del servidor Node. Esto significa que los graffitis compartidos se reinician cuando se reinicia el servidor.

Para desplegar el proyecto, el frontend de Vite y el backend de Socket.IO deben alojarse de una forma que permita conexiones websocket.
