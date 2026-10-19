const OFFER_TTL_SECONDS = 60

export default class OfertaRepository{
    constructor(db){
        this.db = db
    }

    async createWithProtection({ idConductor, idSolicitud }){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')
            await client.query('SELECT pg_advisory_xact_lock($1)', [idConductor])

            const disponible = await client.query(
                `SELECT 1
                 FROM conductores
                 WHERE idUsuario = $1 AND disponible = TRUE
                 LIMIT 1`,
                [idConductor]
            )
            if (disponible.rowCount !== 1){
                const error = new Error('El conductor no está disponible para ofertar')
                error.code = 'DRIVER_UNAVAILABLE'
                throw error
            }

            const activeTrip = await client.query(
                `SELECT 1
                 FROM solicitudes
                 WHERE idConductor = $1
                   AND estado IN ('aceptada', 'en_curso')
                 LIMIT 1`,
                [idConductor]
            )
            if (activeTrip.rowCount === 1){
                const error = new Error('El conductor ya tiene un viaje activo')
                error.code = 'ACTIVE_TRIP'
                throw error
            }

            const solicitud = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idSolicitud = $1
                 FOR UPDATE`,
                [idSolicitud]
            )
            if (solicitud.rowCount !== 1){
                const error = new Error('La solicitud no existe')
                error.code = 'REQUEST_NOT_FOUND'
                throw error
            }
            const row = solicitud.rows[0]
            if (row.estado !== 'buscando' || row.idconductor !== null || new Date(row.expiresat) <= new Date()){
                const error = new Error('La solicitud ya no está disponible para recibir ofertas')
                error.code = 'REQUEST_NOT_AVAILABLE'
                throw error
            }

            const activeOffer = await client.query(
                `SELECT *
                 FROM ofertas
                 WHERE idConductor = $1
                   AND estado = 'vigente'
                   AND expiresAt > now()
                 LIMIT 1`,
                [idConductor]
            )
            if (activeOffer.rowCount === 1){
                if (activeOffer.rows[0].idsolicitud === idSolicitud){
                    await client.query('COMMIT')
                    return { oferta: this.toOferta(activeOffer.rows[0]), created: false }
                }
                const error = new Error('El conductor ya tiene una oferta activa')
                error.code = 'ACTIVE_OFFER'
                throw error
            }

            const result = await client.query(
                `INSERT INTO ofertas (idSolicitud, idConductor, tarifa, estado, expiresAt)
                 SELECT s.idSolicitud, $1, s.tarifaAcordada, 'vigente',
                        LEAST(now() + make_interval(secs => $2), s.expiresAt)
                 FROM solicitudes s
                 WHERE s.idSolicitud = $3
                 RETURNING *`,
                [idConductor, OFFER_TTL_SECONDS, idSolicitud]
            )
            await client.query('COMMIT')
            return { oferta: this.toOferta(result.rows[0]), created: true }
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async acceptWithProtection({ idOferta, idUsuario }){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')

            const found = await this.findOffer(client, idOferta)
            this.assertOwner(found, idUsuario)
            const idConductor = found.idconductor

            await client.query('SELECT pg_advisory_xact_lock($1)', [idConductor])

            const solicitud = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idSolicitud = $1
                 FOR UPDATE`,
                [found.idsolicitud]
            )
            const oferta = await client.query(
                `SELECT *
                 FROM ofertas
                 WHERE idOferta = $1
                 FOR UPDATE`,
                [idOferta]
            )
            this.assertOwner(found, idUsuario)
            this.assertRequestAvailable(solicitud.rows[0])
            this.assertOfferAvailable(oferta.rows[0])

            const conductor = await client.query(
                `SELECT u.rol, c.disponible
                 FROM usuarios u
                 LEFT JOIN conductores c ON c.idUsuario = u.idUsuario
                 WHERE u.idUsuario = $1`,
                [idConductor]
            )
            const activoTrip = await client.query(
                `SELECT 1
                 FROM solicitudes
                 WHERE idConductor = $1
                   AND estado IN ('aceptada', 'en_curso')
                   AND idSolicitud <> $2
                 LIMIT 1`,
                [idConductor, found.idsolicitud]
            )
            const row = conductor.rows[0]
            if (!row || row.rol !== 'conductor' || row.disponible !== true || activoTrip.rowCount === 1){
                const error = new Error('El conductor ya no es elegible para este viaje')
                error.code = 'DRIVER_NOT_ELIGIBLE'
                throw error
            }

            await client.query(
                `UPDATE solicitudes
                 SET estado = 'aceptada', idConductor = $1
                 WHERE idSolicitud = $2`,
                [idConductor, found.idsolicitud]
            )
            await client.query(
                `UPDATE ofertas
                 SET estado = 'aceptada'
                 WHERE idOferta = $1`,
                [idOferta]
            )
            await client.query(
                `UPDATE ofertas
                 SET estado = 'rechazada'
                 WHERE idSolicitud = $1
                   AND idOferta <> $2
                   AND estado = 'vigente'`,
                [found.idsolicitud, idOferta]
            )

            const updated = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idSolicitud = $1`,
                [found.idsolicitud]
            )
            await client.query('COMMIT')
            return this.toSolicitud(updated.rows[0])
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async discardWithProtection({ idOferta, idUsuario }){
        const client = await this.db.connect()
        try{
            await client.query('BEGIN')

            const found = await this.findOffer(client, idOferta)
            this.assertOwner(found, idUsuario)

            const solicitud = await client.query(
                `SELECT *
                 FROM solicitudes
                 WHERE idSolicitud = $1
                 FOR UPDATE`,
                [found.idsolicitud]
            )
            const oferta = await client.query(
                `SELECT *
                 FROM ofertas
                 WHERE idOferta = $1
                 FOR UPDATE`,
                [idOferta]
            )
            this.assertOwner(found, idUsuario)
            this.assertRequestAvailable(solicitud.rows[0])
            this.assertOfferAvailable(oferta.rows[0])

            const updated = await client.query(
                `UPDATE ofertas
                 SET estado = 'rechazada'
                 WHERE idOferta = $1
                 RETURNING *`,
                [idOferta]
            )
            await client.query('COMMIT')
            return this.toOferta(updated.rows[0])
        }catch(error){
            await client.query('ROLLBACK')
            throw error
        }finally{
            client.release()
        }
    }

    async findOffer(client, idOferta){
        const result = await client.query(
            `SELECT o.*, s.idUsuario AS owner
             FROM ofertas o
             JOIN solicitudes s ON s.idSolicitud = o.idSolicitud
             WHERE o.idOferta = $1`,
            [idOferta]
        )
        if (result.rowCount !== 1){
            const error = new Error('La oferta no existe')
            error.code = 'OFFER_NOT_FOUND'
            throw error
        }
        return result.rows[0]
    }

    assertOwner(offer, idUsuario){
        if (offer.owner !== idUsuario){
            const error = new Error('La oferta no pertenece a una solicitud del cliente')
            error.code = 'OFFER_FORBIDDEN'
            throw error
        }
    }

    assertRequestAvailable(solicitud){
        if (!solicitud || solicitud.estado !== 'buscando' || solicitud.idconductor !== null ||
            new Date(solicitud.expiresat) <= new Date()){
            const error = new Error('La solicitud ya no está disponible para decidir ofertas')
            error.code = 'REQUEST_NOT_AVAILABLE'
            throw error
        }
    }

    assertOfferAvailable(oferta){
        if (!oferta || oferta.estado !== 'vigente' || new Date(oferta.expiresat) <= new Date()){
            const error = new Error('La oferta ya venció o fue procesada')
            error.code = 'OFFER_NOT_AVAILABLE'
            throw error
        }
    }

    toOferta(row){
        return {
            id: row.idoferta,
            status: row.estado,
            expiresAt: row.expiresat
        }
    }

    toSolicitud(row){
        return {
            id: row.idsolicitud,
            assignedDriverId: row.idconductor,
            origin: row.origen,
            destination: row.destino,
            reference: row.referencia,
            distanceMeters: row.distanciacotizadametros,
            amount: Number(row.tarifaacordada),
            currency: row.moneda,
            status: row.estado,
            createdAt: row.createat,
            expiresAt: row.expiresat
        }
    }
}
