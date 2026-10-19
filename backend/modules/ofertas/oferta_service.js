export default class OfertaService{
    constructor(repository){
        this.repository = repository
    }

    async create(idConductor, { idSolicitud }){
        return this.repository.createWithProtection({ idConductor, idSolicitud })
    }
}
