# Solicitudes de viaje

Este documento explica la implementación backend de la historia:

> Como cliente, quiero registrar una solicitud para que los conductores puedan verla.

La implementación se concentra únicamente en el backend. El frontend puede
consumir los endpoints descritos aquí cuando se agregue la interfaz
correspondiente.

## Objetivo

Una solicitud representa la intención de un cliente autenticado de pedir un
viaje entre un origen y un destino. El backend:

- identifica al cliente a partir de la sesión autenticada;
- valida las coordenadas recibidas;
- comprueba que ambos puntos estén dentro de la zona piloto de Jalapa;
- calcula la distancia y la tarifa en el servidor;
- guarda la solicitud con estado de búsqueda;
- establece un vencimiento de 90 segundos;
- evita solicitudes activas duplicadas del mismo cliente;
- permite repetir de forma segura el mismo intento;
- permite consultar la solicitud actual y sus ofertas vigentes.

La tarifa, la distancia y el estado no se aceptan como valores confiables desde
React.

## Archivos involucrados

La funcionalidad está organizada en los siguientes archivos:

- `modules/solicitudes/solicitud_controller.js`: define las rutas HTTP,
  valida la entrada y traduce errores a respuestas HTTP.
- `modules/solicitudes/solicitud_service.js`: coordina la idempotencia, la
  cotización y la creación de la solicitud.
- `modules/solicitudes/solicitud_repository.js`: ejecuta las consultas
  PostgreSQL, la transacción y la protección de concurrencia.
- `infrastructure/db/migrations/004_solicitudes_migration.js`: crea las tablas
  e índices necesarios.
- `infrastructure/db/migrations/setup.js`: ejecuta la nueva migración al
  iniciar el backend.
- `infrastructure/registry.js`: registra el controlador, servicio y
  repositorio del módulo.

## Autenticación e identidad

Las rutas de solicitudes se registran en el router principal, después de
`authenticateToken`. Por lo tanto, requieren un token válido mediante:

- el encabezado `Authorization: Bearer <token>`, o
- la cookie de sesión configurada en `SESSION_COOKIE_NAME`.

El controlador obtiene el usuario desde `req.user.sub`, que proviene del token.
El identificador de cliente no se recibe en el cuerpo de la petición.

Además, el token debe indicar el rol `cliente`. Si la identidad no existe o el
rol no corresponde, la petición se rechaza:

- `401`: token sin identidad válida;
- `403`: usuario autenticado que no es cliente.

Esto impide que un cliente cree una solicitud para otra persona cambiando un
campo del JSON.

## Modelo de datos

La migración crea dos tablas: `solicitudes` y `ofertas`.

### Tabla `solicitudes`

| Columna | Descripción |
| --- | --- |
| `idSolicitud` | Identificador interno autoincremental. |
| `idUsuario` | Cliente propietario, relacionado con `usuarios`. |
| `idIntento` | Identificador enviado por el cliente para idempotencia. |
| `origen` | Coordenadas de origen almacenadas como `JSONB`. |
| `destino` | Coordenadas de destino almacenadas como `JSONB`. |
| `referencia` | Texto opcional de referencia, con máximo de 250 caracteres. |
| `distanciaCotizadaMetros` | Distancia calculada por el servidor. |
| `tarifaAcordada` | Importe calculado por el servidor. |
| `moneda` | Moneda de la tarifa; actualmente `GTQ`. |
| `estado` | Estado de la solicitud. |
| `createAt` | Fecha y hora de creación. |
| `expiresAt` | Fecha y hora de vencimiento. |

Los estados permitidos son:

- `buscando`: la solicitud está esperando ofertas;
- `aceptada`: un conductor aceptó la solicitud;
- `en_curso`: el viaje inició;
- `completada`: el viaje terminó;
- `cancelada`: la solicitud fue cancelada;
- `vencida`: la solicitud superó su tiempo de búsqueda.

La creación siempre inicia en `buscando`. La transición a otros estados queda
para los flujos posteriores de conductores, aceptación, cancelación y
finalización.

### Tabla `ofertas`

| Columna | Descripción |
| --- | --- |
| `idOferta` | Identificador de la oferta. |
| `idSolicitud` | Solicitud a la que pertenece. |
| `idConductor` | Conductor que realiza la oferta. |
| `tarifa` | Importe propuesto en la oferta. |
| `estado` | Estado de la oferta. |
| `createAt` | Fecha y hora de creación. |
| `expiresAt` | Fecha y hora de vencimiento. |

Los estados permitidos para una oferta son:

- `vigente`;
- `aceptada`;
- `rechazada`;
- `expirada`.

La tabla ya queda preparada para que el módulo de conductores cree ofertas en
una etapa posterior. En esta implementación se consulta únicamente las ofertas
que estén `vigente` y cuyo `expiresAt` todavía no haya pasado.

### Índices y restricciones

La migración crea:

- un índice único sobre `(idUsuario, idIntento)`, que impide duplicados para el
  mismo cliente e intento;
- un índice por `(idUsuario, estado)`, para localizar rápidamente viajes
  activos;
- un índice por `(idSolicitud, estado, expiresAt)`, para consultar ofertas
  vigentes;
- claves foráneas hacia `usuarios`;
- eliminación en cascada de solicitudes y ofertas si se elimina su propietario
  relacionado.

## Endpoint para crear una solicitud

```http
POST /solicitudes
Content-Type: application/json
Authorization: Bearer <token>
```

También puede utilizarse la cookie de sesión en lugar del encabezado
`Authorization`.

### Cuerpo

```json
{
  "origin": {
    "latitude": 14.6349,
    "longitude": -89.9886
  },
  "destination": {
    "latitude": 14.6412,
    "longitude": -89.9765
  },
  "reference": "Frente al parque central",
  "idempotencyKey": "cliente-123-intento-001"
}
```

### Campos aceptados

#### `origin`

Objeto obligatorio con:

- `latitude`: número finito entre `-90` y `90`;
- `longitude`: número finito entre `-180` y `180`.

#### `destination`

Tiene las mismas reglas que `origin`.

#### `reference`

Campo opcional de texto. Se recorta y no puede superar 250 caracteres.

#### `idempotencyKey`

Identificador obligatorio del intento de creación. Debe ser un texto no vacío
de máximo 100 caracteres. El frontend debe generar un valor por intento real y
reutilizarlo si necesita repetir la petición por un timeout o un error de red.

La tarifa, la distancia, el estado, el cliente, la fecha de creación y la
fecha de vencimiento no forman parte de los datos confiables del cliente.

### Flujo de creación

1. El middleware valida la sesión.
2. El controlador obtiene el cliente desde `req.user.sub`.
3. El controlador valida el cuerpo con `zod`.
4. El servicio busca si ya existe una solicitud del mismo cliente con el mismo
   `idempotencyKey`.
5. Si existe, devuelve esa solicitud y no calcula otra tarifa ni inserta otro
   registro.
6. Si no existe, el servicio llama a `TarifaService.calculateQuote`.
7. `TarifaService` realiza la geocodificación inversa de ambos puntos.
8. Se verifica que origen y destino estén en:
   - departamento: `Jalapa`;
   - país: `GT`.
9. Se calcula la ruta mediante Google Routes API.
10. Se obtiene la distancia real de la ruta y se calcula la tarifa según la
    configuración vigente.
11. El repositorio abre una transacción.
12. Se adquiere un bloqueo advisory de PostgreSQL asociado al cliente.
13. Dentro de la misma transacción se vuelve a revisar la idempotencia.
14. Se comprueba si el cliente tiene una solicitud activa.
15. Si no existe una activa, se inserta la solicitud con vencimiento a 90
    segundos.
16. Se confirma la transacción y se devuelve el registro creado.

La segunda comprobación de idempotencia dentro de la transacción es necesaria
porque dos peticiones simultáneas pueden pasar al mismo tiempo por la primera
consulta del servicio.

### Respuesta exitosa

Código HTTP: `201 Created`.

```json
{
  "solicitud": {
    "id": 15,
    "origin": {
      "latitude": 14.6349,
      "longitude": -89.9886
    },
    "destination": {
      "latitude": 14.6412,
      "longitude": -89.9765
    },
    "reference": "Frente al parque central",
    "distanceMeters": 1850,
    "amount": 3,
    "currency": "GTQ",
    "status": "buscando",
    "createdAt": "2026-10-18T05:30:00.000Z",
    "expiresAt": "2026-10-18T05:31:30.000Z",
    "offers": []
  }
}
```

Los nombres de la respuesta están adaptados a una forma clara para el
frontend, aunque los nombres internos de la base de datos utilicen
`idSolicitud`, `createAt` y `expiresAt`.

## Respuestas de error al crear

| Código | Situación |
| --- | --- |
| `400` | Coordenadas inválidas, referencia inválida, identificador inválido, punto fuera de Jalapa, punto no ubicable o ruta no disponible. |
| `401` | No existe una identidad válida en la sesión. |
| `403` | El usuario autenticado no tiene rol `cliente`. |
| `409` | El cliente ya tiene una solicitud o viaje activo. |
| `502` | Fallo del servicio externo de cotización o error no recuperable al calcular la tarifa. |

Ejemplo de conflicto por solicitud activa:

```json
{
  "message": "El cliente ya tiene un viaje activo"
}
```

## Idempotencia

La idempotencia se basa en la combinación:

```text
idUsuario + idIntento
```

Esto significa que dos clientes pueden utilizar el mismo texto como
`idempotencyKey` sin interferirse entre sí, mientras que el mismo cliente no
puede crear dos registros con el mismo intento.

### Reenvío del mismo intento

Si el frontend envía nuevamente la misma petición con el mismo
`idempotencyKey`:

- se devuelve la solicitud original;
- no se crea un nuevo registro;
- no se vuelve a cotizar la ruta;
- no se modifica la solicitud original.

El `idempotencyKey` debe cambiar cuando el cliente realmente quiere registrar
una nueva solicitud después de que la anterior ya no esté activa.

## Protección contra concurrencia

La creación utiliza una transacción PostgreSQL y el bloqueo:

```sql
SELECT pg_advisory_xact_lock($1)
```

El valor utilizado es el identificador del cliente. Mientras una transacción
está creando o validando una solicitud para ese cliente, otra transacción
simultánea espera antes de revisar el estado.

Dentro del bloqueo se realizan, en este orden:

1. búsqueda del mismo intento;
2. búsqueda de solicitudes activas;
3. inserción de la nueva solicitud.

Una solicitud se considera activa si su estado es:

- `buscando`, siempre que todavía no haya vencido;
- `aceptada`;
- `en_curso`.

Las solicitudes `completada`, `cancelada` y `vencida` no bloquean la creación
de una nueva solicitud.

El índice único de `(idUsuario, idIntento)` funciona además como protección de
integridad en la base de datos, incluso si otro código intenta insertar
directamente.

## Vencimiento

Toda solicitud nueva se guarda con:

```text
expiresAt = fecha actual + 90 segundos
```

El tiempo se calcula en PostgreSQL, no en el navegador. Esto evita depender del
reloj del dispositivo del cliente.

La consulta de solicitud actual solo devuelve una solicitud en estado
`buscando` si `expiresAt > now()`. Por lo tanto, una solicitud de búsqueda
vencida deja de aparecer como actual aunque todavía conserve su registro en la
base de datos.

La implementación actual no ejecuta un proceso de limpieza ni cambia
automáticamente el estado a `vencida`. El vencimiento se aplica en las
consultas mediante la fecha. Un proceso posterior puede actualizar el estado
histórico a `vencida` si el producto lo requiere.

## Endpoint para consultar la solicitud actual

```http
GET /solicitudes/actual
Authorization: Bearer <token>
```

El cliente no envía un `idUsuario` ni un `idSolicitud`. El backend obtiene el
cliente desde la sesión y filtra la consulta por `idUsuario`.

### Respuesta cuando existe una solicitud actual

Código HTTP: `200 OK`.

```json
{
  "solicitud": {
    "id": 15,
    "origin": {
      "latitude": 14.6349,
      "longitude": -89.9886
    },
    "destination": {
      "latitude": 14.6412,
      "longitude": -89.9765
    },
    "reference": "Frente al parque central",
    "distanceMeters": 1850,
    "amount": 3,
    "currency": "GTQ",
    "status": "buscando",
    "createdAt": "2026-10-18T05:30:00.000Z",
    "expiresAt": "2026-10-18T05:31:30.000Z",
    "offers": [
      {
        "id": 4,
        "driverId": 27,
        "amount": 3,
        "status": "vigente",
        "createdAt": "2026-10-18T05:30:20.000Z",
        "expiresAt": "2026-10-18T05:31:10.000Z"
      }
    ]
  }
}
```

### Respuesta cuando no existe una solicitud actual

Código HTTP: `200 OK`.

```json
{
  "solicitud": null
}
```

La consulta devuelve como máximo la solicitud actual más reciente del cliente.
Nunca devuelve solicitudes pertenecientes a otros clientes.

Las ofertas incluidas cumplen simultáneamente:

- pertenecen a la solicitud del cliente autenticado;
- tienen estado `vigente`;
- su vencimiento todavía no ha pasado.

## Integración con la cotización existente

La creación reutiliza `TarifaService`, el mismo servicio utilizado por
`POST /tarifas/cotizacion`.

El servidor utiliza:

- `GOOGLE_MAPS_API_KEY`;
- geocodificación inversa para validar la zona;
- Google Routes API para obtener la distancia;
- `config/tarifa.js` para seleccionar el importe.

Los puntos se validan nuevamente durante la creación. El frontend puede haber
consultado una cotización previamente, pero la solicitud no confía en una
tarifa o distancia enviada desde el navegador.

Esto evita que un cliente altere:

- la tarifa;
- la distancia;
- la zona;
- el estado inicial;
- la identidad del propietario.

## Inicialización de la base de datos

La migración se registra en `infrastructure/db/migrations/setup.js` y se
ejecuta durante el arranque del servidor, junto con las migraciones existentes.

La migración utiliza `CREATE TABLE IF NOT EXISTS` y
`CREATE INDEX IF NOT EXISTS`, por lo que puede ejecutarse en instalaciones
existentes sin eliminar las tablas actuales.

La estructura creada no utiliza la tabla genérica `users`; utiliza la tabla
existente `usuarios`, que es la fuente de identidad del sistema.

## Flujo esperado del frontend

Aunque el frontend se implementará después, el flujo esperado es:

1. El cliente selecciona origen y destino.
2. El frontend puede mostrar una cotización previa mediante
   `POST /tarifas/cotizacion`.
3. Al confirmar, genera un `idempotencyKey` único para ese intento.
4. Envía `POST /solicitudes`.
5. Si hay timeout, reenvía exactamente el mismo cuerpo y la misma clave.
6. Consulta `GET /solicitudes/actual` para actualizar el estado y las ofertas.
7. Cuando la solicitud expire, deja de aparecer como solicitud actual.

El frontend no debe generar una nueva clave automáticamente para un reintento
de red de la misma acción, porque eso podría crear una segunda solicitud si la
primera petición sí llegó al servidor.

## Consideraciones para etapas posteriores

La base backend ya deja preparada la relación entre solicitudes y ofertas,
pero todavía quedan fuera de este cambio:

- endpoint para que los conductores consulten solicitudes disponibles;
- endpoint para crear ofertas;
- aceptación de una oferta;
- transición automática de estados;
- cancelación de solicitudes;
- proceso periódico para marcar solicitudes como `vencida`;
- notificaciones en tiempo real;
- selección de conductor.

Esas funcionalidades deben reutilizar las mismas reglas de propiedad,
validación de estados y protección de concurrencia.
