import { api } from '../config/api'

function aCoordenadas(punto) {
    return {
        latitude: punto.lat,
        longitude: punto.lng
    }
}

export const tarifaService = {
    async getQuote(origen, destino) {
        const response = await api.post('/tarifas/cotizacion', {
            origin: aCoordenadas(origen),
            destination: aCoordenadas(destino)
        })

        return response.data
    }
}
