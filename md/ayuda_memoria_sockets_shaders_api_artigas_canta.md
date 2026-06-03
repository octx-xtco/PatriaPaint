# Ayuda memoria — Integración de Sockets, Shaders y API en “Artigas Canta”

## Contexto general

La app parte de una idea simple: una web interactiva con bustos/estatuas históricas uruguayas que pueden ser intervenidas con graffiti digital.

El proyecto puede evolucionar de una demo técnica a una pieza de código creativo si las herramientas técnicas se integran conceptualmente:

- **Sockets** para convertir la intervención en una acción colectiva.
- **Shaders** para que la materia de la estatua reaccione visualmente.
- **API** para incorporar contexto, lenguaje, datos externos o consignas generadas.

La idea central podría pensarse como una plaza digital donde los monumentos históricos dejan de ser objetos fijos y pasan a ser superficies disputadas, intervenidas y reescritas colectivamente.

---

## Concepto posible

## Monumento Intervenido

Una web donde varias personas entran a una plaza virtual y pueden intervenir bustos históricos uruguayos en tiempo real.

El usuario elige una estatua: Artigas, Rivera, Batlle, etc.  
La estatua aparece como monumento de bronce.  
La música patriótica suena de fondo como una presencia institucional casi inevitable.  
El usuario puede graffitear el busto con spray.

La pieza tensiona:

- solemnidad del monumento
- intervención callejera
- memoria nacional
- vandalismo
- homenaje
- disputa simbólica
- archivo
- próceres como imágenes manipulables

---

## 1. Sockets

### Idea principal

Usar sockets para transformar la app en una intervención colectiva en tiempo real.

En vez de que cada usuario pinte solo su propia estatua, todos los usuarios conectados pueden ver y modificar el mismo monumento compartido.

### Posibles usos

- Sincronizar trazos de graffiti entre usuarios.
- Mostrar la cantidad de usuarios conectados.
- Asignar un color automático a cada usuario.
- Sincronizar cambios de estatua.
- Sincronizar el botón de limpiar graffiti.
- Mostrar quién intervino por última vez, aunque sea de forma anónima.
- Convertir la app en una especie de plaza pública online.

### Eventos posibles

```text
userConnected
userDisconnected
sprayStroke
clearGraffiti
changeStatue
userColorAssigned
```

### Ejemplo conceptual

```text
Usuarios conectados: 7
Última intervención: Rivera
Modo plaza pública: ON
```

### Valor conceptual

Los sockets hacen que el monumento deje de ser una experiencia individual y pase a ser un espacio compartido.

La estatua se vuelve una superficie pública, igual que un muro o una plaza.

---

## 2. Shaders

### Idea principal

Usar shaders para que la estatua no sea solo un modelo 3D iluminado, sino una materia sensible y reactiva.

La superficie del busto puede cambiar según:

- cantidad de pintura acumulada
- música que está sonando
- interacción del usuario
- tiempo
- clima externo
- cantidad de usuarios conectados

### Ideas visuales

## Bronce vivo

Un shader que simule bronce viejo:

- verdín
- oxidación
- manchas
- desgaste
- variaciones de rugosidad
- vetas
- pátina móvil muy sutil

La estatua puede sentirse viva sin moverse de forma literal.

## Estatua reactiva al graffiti

La superficie puede reaccionar a la intervención:

- halos alrededor de la pintura
- la pintura “sangra” levemente
- cambios de rugosidad donde hay graffiti
- oscurecimiento de zonas intervenidas
- pátina más agresiva donde se acumula spray

## Memoria / fantasma histórico

Mientras suena la música o mientras hay interacción:

- ruido procedural sobre el bronce
- leve flicker
- bordes iluminados
- líneas tipo escaneo
- textura de archivo o desgaste
- vibración visual sutil

La estatua se vuelve una especie de espectro histórico.

## Monumento bajo tensión

El shader cambia según el nivel de intervención:

```text
Estatua limpia:
bronce solemne, oscuro, institucional

Estatua medianamente intervenida:
pátina más activa, halos, ruido

Estatua muy intervenida:
glitch, saturación, erosión visual, vibración
```

### Valor conceptual

El shader permite que la materia del monumento responda al acto de intervenirlo.

No es solo “pintar arriba”, sino alterar el estado simbólico de la estatua.

---

## 3. API

### Idea principal

Usar una API para conectar la app con datos, lenguaje o contexto externo.

La API no debería estar solo como adorno técnico. Tiene que reforzar el vínculo entre monumento, historia e intervención.

---

## Posibles usos de API

## API de frases históricas / archivo

Al seleccionar una estatua, la app trae una frase, dato o contradicción histórica asociada al personaje.

Ejemplos:

```text
Artigas — Protector de los Pueblos Libres
Rivera — Fundación del Estado, guerras internas, Salsipuedes
Batlle — Estado moderno, reformas sociales, batllismo
```

Esto le da contexto a la acción de graffitear.

El usuario no interviene una cara cualquiera: interviene una figura cargada de memoria.

---

## API generativa de consignas

Una API de lenguaje puede generar frases de graffiti según:

- personaje elegido
- color seleccionado
- cantidad de pintura acumulada
- música sonando
- cantidad de usuarios conectados
- tono elegido: crítico, absurdo, poético, histórico

Ejemplos de consignas:

```text
LA PATRIA NO ES DE BRONCE
EL MONUMENTO TAMBIÉN SE DISCUTE
¿HÉROE O RELATO?
NO HAY PLAZA NEUTRAL
EL BRONCE TAMBIÉN MIENTE
ARCHIVO VIVO
```

La app podría tener un botón:

```text
Generar consigna
```

Luego la frase puede aparecer como texto/graffiti sobre la estatua o al costado como placa.

---

## API de clima de Montevideo

Traer clima real de Montevideo y usarlo para afectar la escena.

Ejemplos:

### Si llueve

- la pintura chorrea más
- el bronce se ve mojado
- aparecen gotas o streaks
- la luz se vuelve más fría

### Si está soleado

- bronce más contrastado
- más brillo
- sombras más duras

### Si es de noche

- fondo oscuro
- iluminación tipo plaza
- luz de farol o monumento

### Valor conceptual

El monumento digital queda conectado con una ciudad real.

La app no está flotando en la nada: responde al afuera.

---

## API de efemérides o fecha

Según el día, la app puede destacar una estatua, una frase o una música.

Ejemplos:

```text
Hoy la estatua destacada es Batlle.
Hoy el monumento está en modo archivo.
Hoy se activa una consigna histórica.
```

---

## Integración de las tres herramientas

La versión más fuerte sería combinar las tres de forma coherente:

## Sockets

Todos los usuarios intervienen el mismo monumento en tiempo real.

## Shaders

La estatua cambia visualmente según la cantidad de intervención colectiva.

## API

La app genera frases, datos o condiciones contextuales que influyen en la intervención.

Ejemplo de flujo:

1. Usuario entra.
2. La app carga una estatua.
3. Una API trae una frase o dato histórico.
4. Varios usuarios conectados pintan sobre el mismo busto.
5. Los sockets sincronizan los trazos.
6. El shader reacciona a la cantidad de pintura acumulada.
7. El usuario puede sacar una captura como “registro documental” de la intervención.

---

## Features concretos para presentar

### 1. Plaza pública online

Usuarios conectados en tiempo real pintando el mismo busto.

### 2. Spray colectivo

Cada usuario tiene un color propio o una lata asignada.

### 3. Bronce reactivo

Shader de bronce/pátina que cambia según:

- audio
- cantidad de graffiti
- cantidad de usuarios
- tiempo

### 4. Consigna generada

Botón para generar una frase crítica/poética/histórica con API.

### 5. Foto del monumento

Captura del resultado como postal o prueba documental.

### 6. Clima urbano

El clima de Montevideo modifica la escena:

- lluvia
- noche
- humedad
- sol
- bronce mojado

---

## Versión mínima pero potente

Si hay que priorizar, elegiría estas tres:

### Sockets

Sincronizar graffiti entre usuarios.

### Shaders

Bronce/pátina reactiva a la cantidad de pintura.

### API

Generar consignas de graffiti según el personaje.

Con eso ya queda claro el uso de las tres herramientas sin sobrecargar la pieza.

---

## Texto conceptual posible

```text
Monumento Intervenido es una plaza digital donde bustos históricos uruguayos pueden ser graffiteados colectivamente en tiempo real. La pieza tensiona la solemnidad del monumento con la espontaneidad del spray, cruzando memoria nacional, vandalismo, homenaje y disputa simbólica.

Los sockets convierten la intervención en un acto compartido: lo que un usuario pinta aparece también para los demás. Los shaders hacen que la materia del bronce reaccione a la acción colectiva, modificando pátina, ruido, brillo y desgaste según el nivel de intervención. Una API genera consignas o datos históricos asociados a cada figura, reactivando el sentido político y simbólico del monumento.
```

---

## Lectura crítica

La app puede trabajar sobre una contradicción interesante:

Los monumentos están hechos para fijar una versión de la historia.  
El graffiti introduce una capa inestable, popular, efímera y conflictiva.  
La web permite que esa intervención sea colectiva, reversible, acumulativa y documentable.

La pieza no tiene que decidir si el graffiti es homenaje o vandalismo.  
Puede vivir justamente en esa ambigüedad.

---

## Idea de presentación oral

```text
La app parte de una pregunta: ¿qué pasa cuando un monumento deja de ser intocable?

A partir de bustos históricos uruguayos, la pieza propone una plaza digital donde el usuario puede intervenir las estatuas con spray. La intervención no es únicamente individual: mediante sockets puede volverse colectiva y en tiempo real. Los shaders hacen que el bronce reaccione visualmente al nivel de intervención, como si la materia histórica se contaminara o se activara. La API introduce lenguaje y contexto, generando consignas o datos históricos vinculados a cada personaje.

El resultado es una herramienta lúdica pero también crítica, donde memoria, archivo, próceres, vandalismo y participación pública se cruzan dentro de una experiencia web interactiva.
```
