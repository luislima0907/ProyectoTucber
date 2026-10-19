# Consulta de solicitudes para conductores

Este documento describe la implementación backend de la historia:

> Como conductor, quiero consultar solicitudes pendientes de la zona piloto.

La funcionalidad permite que un conductor autenticado active o desactive su
disponibilidad y consulte solicitudes que todavía están buscando conductor.
La respuesta está diseñada para permitir una decisión inicial sin revelar
coordenadas exactas, referencias de recogida ni datos personales del cliente.

## Reglas principales

- Solo se aceptan usuarios autenticados con rol `conductor`.
- Iniciar sesión no activa la disponibilidad automáticamente.
- La disponibilidad se guarda en `conductores.disponible`.
- Para activar disponibilidad, el conductor no debe tener un viaje en estado
  `aceptada` o `en_curso`.
- Solo se consultan solicitudes en estado `buscando`.
- La solicitud debe tener `idConductor IS NULL`.
- La solicitud debe tener `expiresAt > now()`.
- Las coordenadas exactas, la referencia y la identidad del cliente no salen
  en la respuesta de pendientes.
- Las solicitudes vencidas, canceladas, asignadas o completadas no aparecen.

## Persistencia

La migración
`infrastructure/db/migrations/005_disponibilidad_conductores_migration.js`
agrega:

### Disponibilidad del conductor

```text
conductores.disponible BOOLEAN NOT NULL DEFAULT FALSE
```

El valor inicial es `false`. Esto evita inferir disponibilidad solo porque el
conductor inició sesión.

### Asignación de la solicitud

```text
solicitudes.idConductor INTEGER REFERENCES usuarios(idUsuario)
```

Mientras `idConductor` sea `NULL`, la solicitud no está asignada. La consulta
de pendientes exige explícitamente este valor para evitar mostrar viajes que ya
fueron tomados por otro conductor.

### Estado de retirada de oferta

La tabla `ofertas` admite también el estado `retirada`. Este estado permite
quitar una oferta pendiente cuando el conductor se desactiva sin borrar el
registro histórico.

## Consultar disponibilidad propia

```http
GET /drivers/me/availability
Authorization: Bearer <token>
```

La identidad se obtiene desde `req.user.sub`; el cliente no puede consultar la
disponibilidad de otro conductor.

Respuesta:

```json
{
  "disponible": false
}
```

Un usuario sin token válido recibe `401`. Un usuario autenticado que no tenga
rol `conductor` recibe `403`.

## Cambiar disponibilidad propia

```http
PATCH /drivers/me/availability
Content-Type: application/json
Authorization: Bearer <token>
```

Cuerpo:

```json
{
  "disponible": true
}
```

El único campo aceptado es un booleano. El servidor no permite que el
frontend envíe un estado arbitrario o identifique a otro usuario.

### Activar disponibilidad

Para activar (`disponible: true`), el repositorio:

1. inicia una transacción;
2. adquiere un bloqueo advisory por conductor;
3. busca solicitudes asignadas a ese conductor en estado `aceptada` o
   `en_curso`;
4. rechaza la activación con `409` si existe un viaje activo;
5. guarda `disponible = true`;
6. confirma la transacción.

El bloqueo impide que una activación concurrente pase por alto un viaje activo.

Respuesta exitosa:

```json
{
  "disponible": true
}
```

### Desactivar disponibilidad

Para desactivar (`disponible: false`), la misma transacción:

1. inicia una transacción;
2. adquiere el bloqueo advisory del conductor;
3. cambia a `retirada` las ofertas del conductor que estén `vigente` y no
   vencidas;
4. guarda `disponible = false`;
5. confirma la transacción.

No se modifican solicitudes asignadas ni viajes en curso. La desactivación
retira únicamente ofertas pendientes. Por eso un viaje en estado `aceptada` o
`en_curso` no se cancela por cambiar la disponibilidad.

El bloqueo de conductor debe ser reutilizado por el futuro flujo de aceptación
de ofertas. La aceptación deberá tomar el mismo bloqueo antes de comprobar la
oferta y asignar `solicitudes.idConductor`; así la desactivación y la
aceptación no pueden confirmar estados contradictorios.

Respuesta exitosa:

```json
{
  "disponible": false
}
```

Errores relevantes:

| Código | Situación |
| --- | --- |
| `400` | `disponible` no es booleano. |
| `401` | No existe una sesión válida o el token no contiene identidad. |
| `403` | El usuario autenticado no es conductor. |
| `409` | El conductor intenta activar disponibilidad con un viaje activo. |

## Consultar solicitudes pendientes

```http
GET /drivers/requests/pending
Authorization: Bearer <token>
```

La ruta exige:

- sesión válida;
- rol `conductor`;
- disponibilidad persistida en `true`;
- ausencia de viajes propios en estado `aceptada` o `en_curso`.

La consulta SQL filtra las solicitudes con estas condiciones:

```sql
s.estado = 'buscando'
s.idConductor IS NULL
s.expiresAt > now()
```

Si el conductor no está disponible, la respuesta es una lista vacía. No se
activa disponibilidad implícitamente al consultar.

Respuesta:

```json
{
  "solicitudes": [
    {
      "id": 15,
      "originZone": {
        "latitude": 14.63,
        "longitude": -89.99
      },
      "destinationZone": {
        "latitude": 14.64,
        "longitude": -89.98
      },
      "distanceMeters": 1850,
      "amount": 3,
      "currency": "GTQ",
      "status": "buscando",
      "createdAt": "2026-10-18T05:30:00.000Z",
      "expiresAt": "2026-10-18T05:31:30.000Z"
    }
  ]
}
```

## Privacidad de la respuesta

La respuesta se construye con una selección explícita de columnas. No se
devuelve el objeto original `origen` ni `destino`; tampoco se devuelve:

- `referencia`;
- `idUsuario`;
- nombre del cliente;
- correo;
- teléfono;
- cualquier otro dato personal;
- pasajeros.

Las propiedades `originZone` y `destinationZone` se calculan redondeando las
coordenadas a dos decimales en PostgreSQL. Son zonas aproximadas para una
decisión inicial y no son la ubicación exacta de recogida o destino.

La aproximación no debe interpretarse como permiso para que el frontend
reconstruya o solicite la dirección exacta. La ruta exacta solo debe exponerse
cuando exista una transición de estado autorizada, como la asignación o la
aceptación definida en el flujo posterior.

Actualmente la captura de pasajeros no forma parte del modelo. Por eso no se
devuelve `passengers`, ni un valor estimado inventado.

## Estados que no aparecen

La consulta excluye automáticamente:

- solicitudes `vencida`;
- solicitudes `cancelada`;
- solicitudes `aceptada`;
- solicitudes `en_curso`;
- solicitudes `completada`;
- solicitudes con `idConductor` distinto de `NULL`;
- solicitudes cuyo `expiresAt` ya pasó.

La fecha se compara con `now()` de PostgreSQL, no con el reloj del navegador.

## Archivos modificados

- `infrastructure/db/migrations/005_disponibilidad_conductores_migration.js`:
  agrega disponibilidad, asignación y estado de oferta retirada.
- `infrastructure/db/migrations/setup.js`: registra la migración.
- `modules/drivers/driver_controller.js`: agrega las rutas de disponibilidad y
  solicitudes pendientes.
- `modules/drivers/driver_service.js`: coordina las operaciones del perfil del
  conductor.
- `modules/drivers/driver_repository.js`: implementa consultas, transacción,
  bloqueo y filtrado de privacidad.

## Funcionalidades que quedan para el flujo de oferta

Este cambio no crea todavía una oferta ni asigna una solicitud. Esas acciones
deben implementarse posteriormente con estas reglas:

1. comprobar que la solicitud siga en `buscando`;
2. comprobar que `idConductor` siga siendo `NULL`;
3. comprobar que no haya vencido;
4. adquirir el bloqueo del conductor;
5. adquirir el bloqueo de la solicitud con un orden consistente;
6. crear o asignar la oferta dentro de una transacción;
7. evitar revelar la ruta exacta antes del estado permitido.

El estado `retirada` conserva el historial de una oferta que dejó de estar
pendiente al desactivar la disponibilidad.
