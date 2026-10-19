# Backend de TUCBER

## Cotización de tarifa

El backend expone una cotización de tarifa antes de confirmar un viaje:

```text
POST /tarifas/cotizacion
```

La ruta requiere una sesión autenticada mediante la cookie de sesión que crea
el login. El cuerpo debe incluir coordenadas numéricas de origen y destino. El
frontend únicamente envía los puntos; no envía distancia, precio ni una ruta
calculada, porque esos valores deben ser decididos por el backend:

```json
{
  "origin": {
    "latitude": 14.6349,
    "longitude": -89.9886
  },
  "destination": {
    "latitude": 14.6412,
    "longitude": -89.9765
  }
}
```

## Qué problema resuelve

La tarifa se calcula antes de confirmar el viaje para que el cliente conozca
el importe estimado y el sistema pueda mantener ese precio durante el viaje.
El cálculo no depende de valores enviados por React ni de la distancia recorrida
al finalizar. Se utiliza la ruta calculada en el momento de solicitar la
cotización.

El backend devuelve:

- La distancia de la ruta en metros y kilómetros.
- La duración estimada de la ruta en segundos.
- El importe de la tarifa.
- La moneda (`GTQ`) y su símbolo (`Q`).
- Las coordenadas de origen y destino utilizadas.

## Flujo completo de la solicitud

1. El backend valida el formato y los rangos de las coordenadas.
2. Verifica que exista `GOOGLE_MAPS_API_KEY` en el entorno del backend. La
   solicitud se rechaza si la clave no está configurada.
3. Envía cada punto a Google Geocoding mediante una consulta de
   geocodificación inversa. Esto convierte las coordenadas en componentes
   administrativos verificables.
4. Comprueba que ambos puntos pertenezcan simultáneamente a:
   - Municipio: `Jalapa`.
   - Departamento: `Jalapa`.
   - País: `GT` (Guatemala).
5. Si alguno de los puntos está fuera de la zona piloto, el proceso termina y
   no se solicita una ruta ni se calcula una tarifa.
6. Envía origen y destino a Google Routes API con modo de transporte
   `DRIVE`. La distancia se obtiene de `routes.distanceMeters` y la duración
   de `routes.duration`.
7. Si Google no devuelve una ruta, el proceso termina con un error. No se usa
   distancia en línea recta, una distancia enviada por el cliente ni un precio
   predeterminado como sustituto.
8. Con los metros devueltos por Google, [tarifa.js](./config/tarifa.js) los
   convierte a kilómetros y selecciona el primer rango que corresponda.
9. El controlador devuelve la cotización en formato JSON.

Las dos validaciones de zona se ejecutan antes de calcular la ruta. Esto evita
cotizar viajes que comiencen o terminen fuera de la zona piloto.

## Organización del código

La funcionalidad está separada en tres partes:

### Configuración: `config/tarifa.js`

Este archivo contiene todos los valores de negocio relacionados con la
tarifa:

- Moneda y símbolo.
- Nombre del municipio, departamento y país de la zona piloto.
- Importe mínimo y máximo.
- Rangos de distancia y sus importes.

También contiene `calcularTarifa(distanceMeters)`, una función pura que recibe
la distancia obtenida de Google y devuelve kilómetros, importe y moneda. Al
mantener esta información en un solo lugar, no se repiten los límites de
Jalapa ni los precios dentro de los endpoints.

### Servicio: `modules/tarifas/tarifa_service.js`

El servicio contiene la comunicación con Google y la lógica del proceso:

- Consulta Geocoding para cada coordenada.
- Extrae municipio, departamento y país de la respuesta.
- Rechaza puntos que no coincidan con la configuración de la zona.
- Consulta Routes API para obtener la ruta por carretera.
- Comprueba que Google haya devuelto distancia y duración.
- Llama a `calcularTarifa` solamente después de obtener una ruta válida.

El servicio recibe la clave de Google desde `process.env` y no la expone en
ninguna respuesta.

### Controlador: `modules/tarifas/tarifa_controller.js`

El controlador publica `POST /tarifas/cotizacion` y se encarga de:

- Validar el cuerpo usando Zod.
- Devolver `400` cuando las coordenadas no tienen formato válido.
- Ejecutar el servicio.
- Transformar los errores de zona en respuestas `400`.
- Transformar fallos de Google o rutas inexistentes en respuestas `502`.
- Devolver la cotización exitosa con estado `200`.

El módulo se registra en [infrastructure/registry.js](./infrastructure/registry.js)
y se monta desde [main.js](./main.js) después del middleware de autenticación.

## Tarifas configuradas

| Distancia de la ruta | Importe |
| --- | ---: |
| Hasta 2 km | Q3 |
| Más de 2 y hasta 5 km | Q6 |
| Más de 5 y hasta 10 km | Q10 |
| Más de 10 y hasta 15 km | Q15 |
| Más de 15 km | Q20 |

El mínimo es Q3 y el máximo Q20. La zona piloto y estos rangos se mantienen
en un solo archivo para evitar valores repetidos en varios endpoints.

La selección de rangos funciona de forma ordenada:

1. Se divide `distanceMeters` entre `1000`.
2. Se redondea `distanceKm` a dos decimales únicamente para mostrarlo.
3. Se busca el primer rango cuyo límite sea mayor o igual a la distancia.
4. Se aplica el importe de ese rango.
5. El resultado se mantiene entre el mínimo Q3 y el máximo Q20.

Por ejemplo, una ruta de `3,420` metros equivale a `3.42` km y obtiene una
tarifa de `Q6`. Una ruta de `18` km obtiene `Q20`.

Los límites son inclusivos en el extremo superior: exactamente `2` km usa el
primer rango y exactamente `5` km usa el segundo rango.

## Respuesta exitosa

Ejemplo:

```json
{
  "distanceKm": 3.42,
  "amount": 6,
  "currency": "GTQ",
  "currencySymbol": "Q",
  "distanceMeters": 3420,
  "durationSeconds": 780,
  "origin": {
    "latitude": 14.6349,
    "longitude": -89.9886
  },
  "destination": {
    "latitude": 14.6412,
    "longitude": -89.9765
  }
}
```

`amount` es un número para que el frontend pueda mostrarlo o procesarlo
fácilmente. La moneda se entrega por separado para no interpretar
incorrectamente el importe.

## Configuración de Google Maps

En el archivo `.env` del backend configura:

```env
GOOGLE_MAPS_API_KEY=tu_clave_de_google_maps
```

La clave debe permanecer únicamente en el backend y no debe tener prefijo
`VITE_`. Habilita en Google Cloud:

- Geocoding API
- Routes API

También configura restricciones de API y de servidor para esa clave.

No uses `VITE_GOOGLE_MAPS_API_KEY` para esta funcionalidad. Las variables con
prefijo `VITE_` pueden terminar disponibles en el navegador; la clave usada
por Geocoding y Routes debe existir únicamente en el `.env` del backend.

Después de modificar `.env`, reinicia el backend para que Node cargue la nueva
variable de entorno.

## Errores

- `400` por coordenadas inválidas: el cuerpo no cumple el esquema esperado,
  falta `origin` o `destination`, o la latitud/longitud está fuera de su rango.
- `400` por zona: el municipio, departamento o país de un punto no coincide
  con la zona piloto configurada.
- `502` por configuración: falta la clave de Google Maps en el backend.
- `502` por Google: Geocoding o Routes no responde correctamente.
- `502` por ruta: Google no devuelve una ruta disponible, distancia o duración.
- Si no existe una ruta, el backend devuelve un error comprensible y no
  inventa distancia ni tarifa.

## Ejemplos de uso

Con `curl` desde una terminal:

```bash
curl -X POST http://localhost:3001/tarifas/cotizacion \
  -H "Content-Type: application/json" \
  -H "Cookie: tucber_session=TU_COOKIE_DE_SESION" \
  -d '{
    "origin": {
      "latitude": 14.6349,
      "longitude": -89.9886
    },
    "destination": {
      "latitude": 14.6412,
      "longitude": -89.9765
    }
  }'
```

La cookie real se obtiene después de iniciar sesión. Sin una sesión válida, el
middleware general del backend responde `401` antes de ejecutar el módulo de
tarifas.

## Seguridad y precio acordado

- La clave de Google nunca se recibe del cliente ni se devuelve en JSON.
- La ruta está protegida por el middleware JWT existente.
- El servidor valida nuevamente todos los datos aunque el frontend ya los haya
  validado.
- La tarifa se basa en la ruta calculada antes de confirmar el viaje.
- El valor devuelto debe guardarse como el precio acordado del viaje; no debe
  recalcularse usando la distancia recorrida posteriormente.
- Si se cambian rangos o importes, las nuevas cotizaciones usarán la
  configuración actual. Las cotizaciones ya confirmadas deben conservar el
  importe que recibieron.

## Pruebas realizadas

Se verificó:

- Sintaxis de los nuevos módulos del backend.
- Conversión de metros a kilómetros.
- Selección de rangos de Q3 a Q20.
- Moneda `GTQ`.
- Rechazo de una clave de Google ausente.
- Flujo simulado de validación de zona, cálculo de ruta y generación de
  cotización.
