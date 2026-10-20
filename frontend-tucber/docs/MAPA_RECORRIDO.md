# Visualización del recorrido antes de solicitar el viaje

Este documento describe en detalle la implementación frontend y el papel del
backend en la historia:

> Como cliente, quiero visualizar el recorrido entre origen y destino antes de
> solicitar el viaje.

No es solo una descripción de archivos: explica **por qué** cada decisión está
tomada así. La idea central es que el trazado que el cliente ve sea, palabra por
palabra, **la misma ruta con la que se calculó la tarifa**. Todo lo demás está
subordinado a esa garantía.

## Resumen en una frase

El backend calcula la ruta una sola vez con Google Routes API, devuelve su
geometría codificada (`polyline`) y el frontend se limita a **decodificarla y
dibujarla**; nunca calcula ni inventa la ruta por su cuenta.

## La regla que gobierna todo: una sola fuente de verdad

Una ruta se puede obtener de dos maneras:

1. que el frontend le pida a Google una ruta entre los dos puntos, o
2. que el backend devuelva la ruta que **ya** usó para tarificar.

Elegimos la segunda. El motivo es concreto: si el frontend pidiera su propia
ruta, la distancia que vería el cliente podría no coincidir, ni por un metro,
con la distancia que produjo la tarifa. Dos llamadas a Google pueden devolver
trazados distintos por tráfico, por el momento de la consulta o por caché.
Entonces el cliente pagaría por `7.7 km` y vería dibujada una ruta de `8.1 km`,
o al revés. Eso rompe la confianza en la cotización.

Por eso el `polyline` viaja **dentro de la misma respuesta** que trae
`distanceMeters`, `distanceKm` y `amount`: son inseparables. Si hay ruta, hay
tarifa; si hay tarifa, la geometría dibujada es exactamente la que la produjo.

## El recorrido de un dato: de un clic a una línea

### Paso 1. El clic en el mapa

`src/components/MapaSeleccion.jsx` registra un único oyente de clic sobre el
mapa (`addListener('click', ...)`, líneas 94-107). Cuando llega el evento:

- Se lee `event.latLng`, que es el punto geográfico exacto donde el usuario pulsó.
- Se llama a `onSeleccionar(puntoActivo.current, { lat, lng })`.

Dos detalles importan:

- **`puntoActivo` es un `useRef`, no un `useState`.** El valor ("origen" o
  "destino") lo elige un `<select>`. Si fuera estado, cambiar la opción
  volvería a renderizar y obligaría a reinstalar el oyente. Con un `ref`, el
  oyente se registra una sola vez y en el momento del clic lee el valor actual.
  Es el patrón correcto para "un dato que el manejador necesita leer tarde pero
  que no debe provocar renders".
- **`clickableIcons: false`.** Con esta opción, pulsar sobre el icono de una
  tienda o local no abre la burbuja de información de Google ni desvía el clic.
  Así el elemento tocado es siempre el mapa base y las coordenadas son las del
  punto real del mapa, en cualquier lugar: una calle, un lote o un local. Esto
  es justamente lo que permite "marcar la ruta en cualquier punto".

### Paso 2. Guardar el punto e invalidar lo anterior

`seleccionarPunto` en `src/pages/SeleccionViaje.jsx` (líneas 71-94):

- Verifica el punto con `coordenadasValidas` (líneas 7-17). Aunque un clic
  suele traer coordenadas correctas, la geolocalización del navegador u otra
  fuente podrían entregar valores fuera de rango o `NaN`; descartarlos evita
  enviar basura al backend.
- Guarda el punto en `origen`/`destino` y genera una descripción legible
  (`"Recogida seleccionada en el mapa (14.634700, -89.988900)"`), porque más
  adelante la confirmación necesita un texto además de las coordenadas.
- Llama a `invalidarResultado()`, que borra `resumen`, `cotizacion` y
  `errorRuta`.

`invalidarResultado` es la pieza que impide mostrar datos obsoletos: en cuanto
un punto cambia, la cotización anterior deja de ser válida y se elimina. No
tiene sentido dibujar una ruta o un precio que corresponden a una selección que
ya no existe.

### Paso 3. Disparar la cotización

Un `useEffect` (líneas 62-69) observa `origen` y `destino`. Cuando **ambos** son
coordenadas válidas, pide la cotización; mientras no lo sean, no consulta nada.
El efecto es la forma idiomática en React de reaccionar a un cambio de estado
derivando un efecto secundario como una llamada a red.

El servicio `src/services/tarifaService.js` traduce el contrato del mapa al
contrato del backend:

- El mapa usa `{ lat, lng }`.
- El backend espera `{ latitude, longitude }` (definido por el esquema Zod del
  controlador).

La conversión se hace en un solo lugar (`aCoordenadas`) para que la vista no
tenga que conocer los nombres internos del API. La petición es
`POST /tarifas/cotizacion` con cuerpo `{ origin, destination }`.

### Paso 4. Backend: validar la zona con geocodificación inversa

`backend/modules/tarifas/tarifa_service.js` → `calculateQuote` (líneas 12-34):

1. Comprueba que exista la clave de Google del backend; si no, falla temprano
   con un mensaje claro en lugar de hacer una llamada que devolverá error.
2. Geocodifica **ambos** puntos en paralelo con `Promise.all`. Aquí se usan dos
   conceptos que conviene no confundir:
   - la **geocodificación inversa** convierte coordenadas en dirección, y
   - la **geocodificación** convierte dirección en coordenadas.

   Solo necesitamos la inversa, y solo para saber **dónde cae** el punto en
   términos administrativos.
3. Valida que cada punto esté en la zona piloto.

`reverseGeocode` (líneas 36-51) llama a `maps/api/geocode/json` con
`latlng=lat,lng`. Exige `status === 'OK'` y al menos un resultado; si Google no
reconoce el punto, se lanza un error en lugar de continuar con datos vacíos.

`assertInPilotZone` (líneas 53-65) lee los componentes de la dirección:

- `administrative_area_level_1` → el departamento.
- `country` con `short_name` → el código de país (`GT`).

Dos decisiones sutiles, y ambas importan:

- **Normalizamos el departamento.** Google devuelve a veces `"Jalapa"` y a veces
  `"Jalapa Department"` para la misma zona. Comparar por igualdad estricta
  hacía que muchos puntos válidos (por ejemplo, en el campo, fuera de los
  locales comerciales) fueran rechazados como si estuvieran fuera de cobertura.
  Por eso comparamos en minúsculas con `includes`. Es la corrección de un bug
  real observado: tiendas y locales funcionaban y puntos arbitrarios no.
- **Usamos `short_name` del país, no `long_name`.** El código `GT` es estable;
  el nombre largo podría venir en otro idioma o con variantes, y usamos
  `long_name` para el departamento porque ahí sí es legible y comparable.

Si el punto no está en la zona, se lanza `"El punto de {origen|destino} está
fuera de la zona piloto"`, que el controlador traducirá a un `400`.

### Paso 5. Backend: pedir la ruta a Google Routes API

`getRoute` (líneas 71-116) es el corazón del trazado.

- Es un `POST` a `routes.googleapis.com/.../computeRoutes`. Se usa la versión
  moderna (Routes API) en lugar de la antigua Directions API.
- Dos cabeceras son obligatorias y no obvias:
  - `X-Goog-Api-Key`: la credencial, que vive **solo** en el backend.
  - `X-Goog-FieldMask`: la lista de campos que queremos. Routes API **exige**
    declarar qué campos devolver. Pedimos exactamente tres:
    `routes.distanceMeters`, `routes.duration` y `routes.polyline.encodedPolyline`.
    Esto no es un detalle menor: pedir solo lo necesario reduce el tamaño de la
    respuesta y deja explícito qué depende el cliente. `distanceMeters` y
    `duration` son para la tarifa y el tiempo; `encodedPolyline` es la geometría
    que se va a dibujar.
- El cuerpo usa `travelMode: 'DRIVE'` (un viaje en carro) y
  `routingPreference: 'TRAFFIC_AWARE'` (que considere el tráfico, para que la
  distancia y el tiempo se acerquen a la realidad). Las coordenadas van como
  `latLng: { latitude, longitude }`, el formato propio de Routes API.
- La respuesta se interpreta con cuidado:
  - `route.duration` llega como cadena (`"780s"`), así que se convierte con
    `Number.parseInt`.
  - Si no hay `distanceMeters` o no hay ruta, se lanza
    `"No existe una ruta disponible entre los puntos"`.
  - `polyline` puede faltar; en ese caso se devuelve `null` explícitamente, no
    `undefined`. El frontend debe poder distinguir "sin geometría" de "campo
    ausente".

**¿Por qué `encodedPolyline` y no una lista de coordenadas?** Porque una ruta
de varios kilómetros puede tener cientos de vértices. Una cadena codificada es
muchísimo más compacta de transportar y es el formato estándar que Google
produce y que la librería `geometry` sabe decodificar. Es información
suficiente para dibujar sin recalcular nada.

### Paso 6. Backend: convertir distancia en tarifa

`calcularTarifa` (en `backend/config/tarifa.js`) toma `distanceMeters`, la
pasa a kilómetros y busca el primer rango cuyo límite superior sea mayor o
igual a la distancia. El resultado se acota entre un mínimo y un máximo. La
tabla de rangos y los límites viven en **un solo archivo de configuración** para
que no haya importes repetidos ni contradictorios entre endpoints.

Un detalle intencional: los kilómetros se redondean a dos decimales **solo para
mostrarlos**; el cálculo usa el valor sin redondear. Redondear antes de
seleccionar el rango podría mover un viaje a una banda equivocada por un error
de milésimas.

### Paso 7. La respuesta

`calculateQuote` devuelve una sola estructura con todo lo necesario:

- `distanceKm`, `amount`, `currency`, `currencySymbol` (de `calcularTarifa`).
- `distanceMeters` y `durationSeconds`.
- `polyline` (la geometría, o `null`).
- `origin` y `destination` (eco de los puntos consultados).

Ese eco de los puntos no es decorativo: permite al cliente verificar que la
cotización corresponde exactamente a las coordenadas que envió, lo que cierra
el círculo de "una sola fuente de verdad".

### Paso 8. Frontend: descartar respuestas viejas

Antes de dibujar, hay un problema de concurrencia. Si el usuario marca un
punto, luego lo corrige, y la primera respuesta tarda más que la segunda, una
respuesta lenta podría llegar después y pintar una ruta que ya no corresponde.
La solución es un contador, `solicitudCotizacion` (un `useRef`):

- Cada petición hace `++solicitudCotizacion.current` y guarda su valor local.
- Cuando la respuesta llega (éxito o error), se compara con el valor actual del
  contador. Si cambió, la respuesta se descarta.
- Si los puntos dejan de ser válidos, el contador también se incrementa
  (línea 64), para invalidar cualquier petición en vuelo.

Es un patrón "gana la última" que garantiza que solo la selección vigente puede
actualizar `cotizacion` y `errorRuta`. Se eligió por ser simple y correcto para
el flujo: el estado final siempre refleja la última interacción, sin importar
el orden en que lleguen las respuestas.

### Paso 9. Frontend: decodificar la geometría

En `MapaSeleccion.jsx`, un efecto (líneas 149-166) reacciona a la prop `ruta`
(que es `cotizacion?.polyline`):

- Antes de dibujar, elimina el trazado anterior con `trazado.current.setMap(null)`.
  Sin esto, cada nueva ruta dejaría la anterior pintada debajo.
- Si `ruta` es `null`, no dibuja nada. Es decir, cuando la cotización falla o se
  invalida, la ruta desaparece en vez de quedar congelada.
- Decodifica con `encoding.decodePath(ruta)`. Esta función viene de la librería
  `geometry` y convierte la cadena en un arreglo de puntos `LatLng` que
  `Polyline` entiende.
- Dibuja con `Polyline`, con el color de marca, grosor 5 y opacidad 0.9.

**¿Por qué no dibujar una línea recta entre origen y destino?** Porque sería
mentira útil solo a medias. Una recta cruzaría casas, ríos y sentidos de vía
contrarios, y sugeriría una distancia que no es la que se cobra. La historia lo
prohíbe explícitamente: la ruta es referencial, pero real. Si no hay geometría
del backend, no hay línea.

### Paso 10. Frontend: encuadrar origen, destino y ruta

Un efecto (líneas 168-181) llama a `fitBounds` con un rectángulo que contiene
los dos puntos, y `panTo(centro)` cuando solo hay un punto. El objetivo es que
el usuario vea de un vistazo todo el recorrido, sin arrastrar el mapa.

Aquí hubo un bug real y su corrección merece explicación: se intentó usar
`new google.maps.LatLngBounds(...)`, pero `importLibrary('maps')` no expone ese
constructor de la forma esperada y la app se rompía con
`claseBounds.current is not a constructor`. La solución es pasar un objeto
literal `{ north, south, east, west }`: `fitBounds` lo acepta igual, con la
ventaja de que no dependemos de un símbolo que no está disponible en el bundle.

### Paso 11. Frontend: los marcadores

Un efecto (líneas 109-147) mantiene los marcadores "O" (origen, verde) y "D"
(destino, azul) usando `AdvancedMarkerElement`. Se usa este tipo de marcador
porque el mapa se crea con `mapId` (necesario con los mapas vectoriales
actuales) y porque permite contenido HTML personalizado. Si un punto desaparece
(porque el usuario editó la descripción), el marcador se quita del mapa
asignando `map = null`.

## Por qué los puntos y las descripciones están separados

En `SeleccionViaje.jsx`, editar el texto de origen o destino pone el punto
correspondiente en `null` (`editarDescripcion`, líneas 96-109) y limpia la
cotización. La razón es de coherencia: si el marcador dice una coordenada y el
texto dice otra cosa, mostrar los dos juntos confunde. La pantalla exige
**descripción y punto** para continuar, y al cambiar cualquiera de los dos se
descarta el resultado anterior.

## Estados de la interfaz: derivados, no almacenados

La vista no guarda "estoy calculando" ni "puedo continuar" como estados
independientes; los **deriva**:

- `puntosListos`: ambos puntos son coordenadas válidas.
- `calculandoRuta`: hay puntos válidos, no hay cotización y no hay error.
- `puedeContinuar`: ambos puntos válidos, ambas descripciones no vacías y
  cotización presente.

Derivar evita el problema clásico de estados que se contradicen (por ejemplo,
"puedo continuar" en `true` mientras la cotización es `null`). Como se calculan
a partir de la misma información, no pueden desincronizarse.

## Errores, reintentos y códigos

El backend traduce los fallos en códigos con intención:

- `400`: la petición es inválida o el punto está fuera de la zona piloto
  (culpa del cliente).
- `502`: Google falló o no hay ruta (culpa de un servicio externo). Se usa
  `502 Bad Gateway` porque el backend actuó como intermediario y el fallo vino
  de aguas arriba.

En el frontend, si la cotización falla:

- se muestra `error.response?.data?.message` (el mensaje del backend) o uno
  genérico;
- no se dibuja ruta (porque `polyline` no existe);
- "Continuar" sigue deshabilitado;
- aparece "Reintentar", que repite la consulta con los mismos puntos.

Las direcciones escritas por el cliente **nunca** se borran por un error: el
trabajo del usuario se conserva siempre. Si el mapa no carga, se muestra el
error y los campos de texto siguen visibles.

## Configuración de la clave

La clave del navegador va en `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=tu_clave_del_navegador
```

El prefijo `VITE_` hace que Vite la incruste en el bundle; por eso **esa** clave
debe estar restringida por sitio web y habilitar solo **Maps JavaScript API**.
La clave que consulta rutas y geocodificación es distinta y permanece en el
backend (`GOOGLE_MAPS_API_KEY`): nunca se entrega a React. Separar las claves
limita el daño si la del navegador se filtra y respeta el principio de mínimo
privilegio.

El cargador (`@googlemaps/js-api-loader`) pide las librerías en paralelo
(`Promise.all`): `maps` (Map y Polyline), `marker` (AdvancedMarkerElement) y
`geometry` (decodificación de la ruta). Se cargan por separado porque este
librerías se descargan solo cuando hacen falta.

## Flujo completo, resumido

1. El cliente marca origen y destino en el mapa.
2. El frontend valida las coordenadas y, con ambos puntos, pide la cotización.
3. El backend geocodifica ambos puntos, valida la zona piloto y pide la ruta.
4. Google devuelve distancia, duración y `polyline`.
5. El backend convierte la distancia en tarifa y responde con todo junto.
6. El frontend descarta respuestas viejas, decodifica el `polyline` y dibuja.
7. La vista muestra distancia y tarifa; "Continuar" se habilita.
8. La confirmación vuelve a mostrar distancia y tarifa con los mismos datos.
9. Al cambiar un punto, se descarta todo y se repite desde el paso 2.

## Archivos involucrados

- `src/services/tarifaService.js`: petición `POST /tarifas/cotizacion` y
  conversión de `{lat,lng}` a `{latitude,longitude}`.
- `src/components/MapaSeleccion.jsx`: mapa, marcadores, oyente de clic, y
  decodificación + dibujo del `polyline`.
- `src/pages/SeleccionViaje.jsx`: selección de puntos, disparo de la
  cotización, guarda de respuestas viejas, errores, reintento y habilitación de
  "Continuar".
- `src/pages/ConfirmacionViaje.jsx`: muestra distancia y tarifa reales y solo
  habilita "Confirmar selección" con cotización válida.
- `src/css/SeleccionViaje.css`: estilos del estado de cálculo, el error y el
  botón de reintento.
- `backend/modules/tarifas/tarifa_controller.js`: validación Zod, códigos de
  estado y mensajes.
- `backend/modules/tarifas/tarifa_service.js`: geocodificación inversa,
  validación de zona, llamada a Routes API y `polyline`.
- `backend/config/tarifa.js`: zona piloto y rangos de tarifa.

## Pruebas y verificación realizadas

- Cambiar un punto actualiza la ruta y no deja el trazado anterior como vigente:
  la cotización se limpia al cambiar la selección y las respuestas viejas se
  descartan por el contador.
- El recorrido mostrado corresponde a los puntos y la distancia de la
  cotización: la geometría proviene de la misma respuesta que trae
  `distanceMeters` y `amount`.
- Un fallo de Google Maps deja visibles las direcciones, no dibuja ruta y no
  habilita "Continuar" ni "Confirmar selección".
- Zona piloto verificada con la API real: puntos de campo que Google nombra
  `"Jalapa Department"` ahora se aceptan, y puntos de otro departamento siguen
  rechazados con `400`.
- Rangos de tarifa verificados: por ejemplo, `7.7 km` produce `Q15` y `18 km`
  produce `Q25`.

## Alcance

La ruta es una referencia visual para decidir antes de solicitar. No incluye
navegación giro a giro ni seguimiento continuo del conductor.

La creación del viaje (`POST /solicitudes`) no forma parte de este cambio.
