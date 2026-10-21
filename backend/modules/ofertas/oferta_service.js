export default class OfertaService{
    constructor(repository){
        this.repository = repository
    }

    async create(idConductor, { idSolicitud }){
        return this.repository.createWithProtection({ idConductor, idSolicitud })
    }

    async accept(idUsuario, idOferta){
        return this.repository.acceptWithProtection({ idOferta, idUsuario })
    }

    async discard(idUsuario, idOferta){
        return this.repository.discardWithProtection({ idOferta, idUsuario })
    }
}
