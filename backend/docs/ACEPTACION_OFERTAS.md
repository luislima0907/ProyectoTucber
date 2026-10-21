# Aceptación y descarte de ofertas

Este documento describe la implementación backend de la historia:

> Como cliente, quiero aceptar un conductor luego de revisar su perfil.

La funcionalidad permite que el cliente propietario de una solicitud acepte una
oferta, asignando al conductor, o descarte una oferta para seguir buscando. La
aceptación, la asignación y la liberación de las demás ofertas ocurren dentro de
una sola transacción.

## Reglas principales

- Solo el cliente autenticado y propietario de la solicitud puede decidir sobre
  sus ofertas.
- La oferta debe seguir `vigente` y no vencida.
- La solicitud debe seguir en `buscando`, sin conductor asignado y no vencida.
- La aceptación verifica la elegibilidad actual del conductor: rol
  `conductor`, `conductores.disponible = TRUE` y sin otro viaje activo.
- Al aceptar, la oferta elegida pasa a `aceptada`, la solicitud pasa a
  `aceptada` con `idConductor` asignado y las demás ofertas `vigentes` de esa
  solicitud pasan a `rechazada`.
- Al descartar, solo la oferta elegida pasa a `rechazada`. La solicitud sigue
  `buscando` hasta su vencimiento original, sin reiniciar el plazo.
- Una oferta vencida o ya procesada no puede aceptarse ni descartarse.

## Aceptar una oferta

```http
POST /ofertas/:id/aceptar
Authorization: Bearer <token>
```

El identificador de la oferta viaja en la ruta. La identidad del cliente se
obtiene desde `req.user.sub`; el cliente no decide sobre ofertas de otros.

### Flujo transaccional

El repositorio ejecuta una única transacción:

1. inicia la transacción;
2. busca la oferta y su solicitud para conocer el conductor y el propietario;
3. rechaza con `403` si la solicitud no pertenece al cliente autenticado;
4. adquiere el bloqueo advisory del conductor;
5. bloquea la solicitud y la oferta con `FOR UPDATE`;
6. vuelve a comprobar la solicitud, la oferta, el vencimiento de ambas y la
   elegibilidad del conductor;
7. actualiza la solicitud a `aceptada` con `idConductor`;
8. marca la oferta elegida como `aceptada`;
9. marca las demás ofertas `vigentes` de la solicitud como `rechazada`;
10. confirma la transacción.

### Respuesta exitosa

Código HTTP: `200 OK`.

```json
{
  "solicitud": {
    "id": 15,
    "assignedDriverId": 27,
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
    "status": "aceptada",
    "createdAt": "2026-10-18T05:30:00.000Z",
    "expiresAt": "2026-10-18T05:31:30.000Z"
  }
}
```

## Descartar una oferta

```http
POST /ofertas/:id/descartar
Authorization: Bearer <token>
```

### Flujo transaccional

1. inicia la transacción;
2. busca la oferta y su solicitud y comprueba la propiedad;
3. bloquea la solicitud y la oferta con `FOR UPDATE`;
4. comprueba que la solicitud siga en `buscando`, no vencida, y que la oferta
   siga `vigente` y no vencida;
5. marca la oferta elegida como `rechazada`;
6. confirma la transacción.

La solicitud no cambia de estado ni de `expiresAt`. El cliente puede seguir
recibiendo ofertas hasta el vencimiento original de la búsqueda.

### Respuesta exitosa

Código HTTP: `200 OK`.

```json
{
  "oferta": {
    "id": 7,
    "status": "rechazada",
    "expiresAt": "2026-10-18T05:31:00.000Z"
  }
}
```

## Respuestas de error

Aplica a `aceptar` y `descartar`:

| Código | Situación |
| --- | --- |
| `400` | El identificador de la oferta no es un entero positivo. |
| `401` | No existe una sesión válida o el token no contiene identidad. |
| `403` | El usuario autenticado no es cliente. |
| `403` | La oferta pertenece a la solicitud de otro cliente. |
| `404` | La oferta no existe. |
| `409` | La solicitud ya no está buscando, ya fue asignada o venció. |
| `409` | La oferta venció o ya fue procesada. |
| `409` | El conductor ya no es elegible (rol, disponibilidad u otro viaje). |
| `500` | Error inesperado del servidor. |

## Protección contra concurrencia

Las decisiones toman un bloqueo advisory por conductor y luego bloquean con
`FOR UPDATE` la solicitud y la oferta, en ese orden. La creación de ofertas
(`oferta_repository.createWithProtection`) también bloquea la solicitud con
`FOR UPDATE` y el conductor con el bloqueo advisory, por lo que la creación y
la aceptación no pueden confirmar estados contradictorios.

- Dos aceptaciones simultáneas sobre la misma solicitud se serializan en el
  bloqueo de la solicitud: la primera asigna al conductor y la segunda
  encuentra la solicitud en `aceptada` y responde `409`.
- Una aceptación concurrente con el retiro de ofertas
  (`PATCH /drivers/me/availability` con `disponible: false`) se serializa en el
  bloqueo advisory del conductor.
- El vencimiento se compara con `now()` de PostgreSQL dentro de la misma
  transacción.
- La creación de ofertas bloquea la solicitud, por lo que no se insertan
  ofertas `vigentes` en una solicitud que acaba de ser aceptada.

La cancelación de solicitudes todavía no está implementada. Cuando exista,
deberá tomar el bloqueo de la solicitud para seguir coordinando las
transiciones.

## Ruta exacta para el conductor asignado

Mientras la solicitud está en búsqueda, la consulta de pendientes solo devuelve
zonas aproximadas. Una vez aceptada la oferta, el conductor asignado obtiene la
ruta exacta:

```http
GET /drivers/requests/current
Authorization: Bearer <token>
```

La consulta filtra por `idConductor = <conductor autenticado>` y estado
`aceptada` o `en_curso`. Devuelve el `origin`, `destination` y `reference`
exactos del viaje asignado.

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
    "status": "aceptada",
    "createdAt": "2026-10-18T05:30:00.000Z",
    "expiresAt": "2026-10-18T05:31:30.000Z"
  }
}
```

Si el conductor no tiene un viaje asignado, la respuesta es
`{ "solicitud": null }`. Un conductor que solo envió una oferta no accede a la
ruta exacta: la consulta exige que la solicitud tenga su `idConductor`.

## Privacidad

La ruta exacta de recogida y destino solo se expone a:

- el cliente propietario de la solicitud, mediante `GET /solicitudes/actual`;
- el conductor ya asignado, mediante `GET /drivers/requests/current`.

La consulta de solicitudes pendientes para conductores
(`GET /drivers/requests/pending`) mantiene las coordenadas aproximadas y no
devuelve `reference`, `idUsuario` ni datos personales del cliente.

## Pruebas adicionales

- Dos aceptaciones simultáneas asignan como máximo un conductor: la segunda
  recibe `409`.
- Una aceptación concurrente con cancelación o retiro no deja estados
  contradictorios: los bloqueos serializan ambas operaciones.
- Una oferta vencida o de otro cliente es rechazada: `409` por vencimiento y
  `403` por propiedad.
- Las otras ofertas dejan de estar pendientes (`rechazada`) y sus conductores
  quedan liberados, por lo que pueden volver a ofertar.

## Archivos involucrados

- `modules/ofertas/oferta_repository.js`: transacciones de aceptación y
  descarte, bloqueos y liberación de ofertas.
- `modules/ofertas/oferta_service.js`: coordinación de `accept` y `discard`.
- `modules/ofertas/oferta_controller.js`: rutas, validación y traducción de
  errores a HTTP.
- `modules/drivers/driver_repository.js`: consulta del viaje asignado con ruta
  exacta.
- `modules/drivers/driver_service.js` y `driver_controller.js`: exposición de
  `GET /drivers/requests/current`.
