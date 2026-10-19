# Oferta de un conductor sobre una solicitud

Este documento describe la implementación backend de la historia:

> Como conductor, quiero ofrecerme a una solicitud y reservarla temporalmente
> mientras el cliente decide.

La funcionalidad permite que un conductor autenticado y disponible cree una
oferta pendiente sobre una solicitud que sigue buscando. La oferta tiene un
vencimiento calculado en el servidor y no reserva la solicitud en exclusiva.

## Reglas principales

- Solo se aceptan usuarios autenticados con rol `conductor`.
- El conductor debe tener `conductores.disponible = TRUE`.
- El conductor no debe tener un viaje activo (`aceptada` o `en_curso`).
- La solicitud debe estar en estado `buscando`, con `idConductor IS NULL` y
  `expiresAt > now()`.
- Un conductor no puede tener dos ofertas activas al mismo tiempo.
- La oferta queda pendiente un máximo de 60 segundos.
- El vencimiento se calcula en el servidor como el mínimo entre la creación más
  60 segundos y el vencimiento de búsqueda de la solicitud.
- La respuesta solo incluye identificador, estado y vencimiento. No se devuelve
  la ubicación exacta del cliente.

## Alcance de la reserva temporal

Ofrecerse no reserva la solicitud en exclusiva: otros conductores pueden
ofrecerse mientras la solicitud siga buscando. La reserva temporal se limita a
impedir que el mismo conductor tenga otra oferta activa.

## Modelo de datos

No se agregan migraciones. La tabla `ofertas` ya existe en
`infrastructure/db/migrations/004_solicitudes_migration.js`:

| Columna | Descripción |
| --- | --- |
| `idOferta` | Identificador de la oferta. |
| `idSolicitud` | Solicitud sobre la que se oferta. |
| `idConductor` | Conductor que realiza la oferta. |
| `tarifa` | Importe de la oferta. Se copia de `solicitudes.tarifaAcordada`. |
| `estado` | Estado de la oferta: `vigente`, `aceptada`, `rechazada`, `expirada` o `retirada`. |
| `createAt` | Momento de creación. |
| `expiresAt` | Momento de vencimiento calculado por el servidor. |

Una oferta se considera activa cuando `estado = 'vigente'` y
`expiresAt > now()`.

## Crear oferta

```http
POST /ofertas
Content-Type: application/json
Authorization: Bearer <token>
```

La identidad se obtiene desde `req.user.sub`; el cliente no puede ofertar en
nombre de otro conductor.

Cuerpo:

```json
{
  "idSolicitud": 15
}
```

El único campo aceptado es el identificador de la solicitud. La tarifa no se
recibe del cliente: se copia de la solicitud dentro de la transacción.

### Flujo transaccional

El repositorio ejecuta una única transacción:

1. inicia la transacción;
2. adquiere un bloqueo advisory por conductor;
3. comprueba que el conductor está disponible;
4. comprueba que el conductor no tiene un viaje activo;
5. comprueba que la solicitud existe, sigue en `buscando`, no está asignada y
   no venció;
6. busca una oferta activa del conductor:
   - si la oferta activa es sobre la misma solicitud, confirma y devuelve la
     oferta existente sin duplicar ni extender el vencimiento;
   - si la oferta activa es sobre otra solicitud, rechaza con `409`;
7. inserta la oferta con vencimiento
   `LEAST(now() + interval '60 seconds', solicitudes.expiresAt)`;
8. confirma la transacción.

### Respuesta exitosa

Oferta creada (`201`):

```json
{
  "oferta": {
    "id": 7,
    "status": "vigente",
    "expiresAt": "2026-10-18T05:31:00.000Z"
  }
}
```

Envío repetido de la misma oferta pendiente (`200`): devuelve la misma oferta
sin crear un registro nuevo y sin extender `expiresAt`.

```json
{
  "oferta": {
    "id": 7,
    "status": "vigente",
    "expiresAt": "2026-10-18T05:31:00.000Z"
  }
}
```

### Respuestas de error

| Código | Situación |
| --- | --- |
| `400` | `idSolicitud` ausente o no es un entero positivo. |
| `401` | No existe una sesión válida o el token no contiene identidad. |
| `403` | El usuario autenticado no es conductor. |
| `404` | La solicitud no existe. |
| `409` | El conductor no está disponible. |
| `409` | El conductor tiene un viaje activo. |
| `409` | La solicitud ya no está buscando, ya fue asignada o venció. |
| `409` | El conductor ya tiene una oferta activa sobre otra solicitud. |
| `500` | Error inesperado del servidor. |

## Cálculo del vencimiento

El vencimiento se calcula con la hora de PostgreSQL, nunca con el reloj del
cliente:

```sql
LEAST(now() + interval '60 seconds', solicitudes.expiresAt)
```

Una oferta creada cuando la búsqueda está por terminar vence junto con la
búsqueda. Por ejemplo, una oferta creada en el segundo 80 de una búsqueda que
vence en el segundo 90 queda con vencimiento en el segundo 90.

## Privacidad de la respuesta

La respuesta se construye con una selección explícita de columnas. No se
devuelve el objeto `origen` ni `destino`, ni la referencia, ni datos personales
del cliente. Solo se exponen `id`, `status` y `expiresAt`.

## Protección contra concurrencia

La comprobación por conductor está protegida con
`SELECT pg_advisory_xact_lock($1)` usando el identificador del conductor. Dos
peticiones simultáneas del mismo conductor se serializan: la segunda espera a
que la primera confirme y detecta la oferta activa, por lo que no se crean dos
ofertas activas. El mismo bloqueo se reutiliza en la desactivación de
disponibilidad (`driver_repository.setAvailability`).

## Pruebas adicionales

- Varios conductores pueden tener ofertas sobre una misma solicitud: cada uno
  obtiene su propia oferta `vigente`.
- Un conductor no consigue dos ofertas activas por peticiones simultáneas: el
  bloqueo advisory serializa ambas y la segunda devuelve la oferta existente o
  `409` si es sobre otra solicitud.
- Una oferta creada en el segundo 80 de una búsqueda que vence en el segundo 90
  vence al finalizar la búsqueda (segundo 90).
- Solicitudes vencidas o ya asignadas no aceptan ofertas nuevas: responden
  `409`.

## Archivos involucrados

- `modules/ofertas/oferta_controller.js`: ruta, validación y traducción de
  errores a HTTP.
- `modules/ofertas/oferta_service.js`: coordinación de la operación.
- `modules/ofertas/oferta_repository.js`: transacción, bloqueo, comprobaciones
  e inserción de la oferta.
- `infrastructure/registry.js`: registro del módulo.
