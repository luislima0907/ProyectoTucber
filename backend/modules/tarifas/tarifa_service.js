import { TARIFA_CONFIG, calcularTarifa } from '../../config/tarifa.js'

const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const GOOGLE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

export default class TarifaService {
    constructor(apiKey, fetchImplementation = fetch) {
        this.apiKey = apiKey
        this.fetch = fetchImplementation
    }

    async calculateQuote(origin, destination) {
        if (!this.apiKey) {
            throw new Error('El backend no tiene configurada la clave de Google Maps')
        }

        const [originAddress, destinationAddress] = await Promise.all([
            this.reverseGeocode(origin),
            this.reverseGeocode(destination)
        ])

        this.assertInPilotZone(originAddress, 'origen')
        this.assertInPilotZone(destinationAddress, 'destino')

        const route = await this.getRoute(origin, destination)
        return {
            ...calcularTarifa(route.distanceMeters),
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
            polyline: route.polyline,
            origin,
            destination
        }
    }

    async reverseGeocode(point) {
        const params = new URLSearchParams({
            latlng: `${point.latitude},${point.longitude}`,
            key: this.apiKey
        })
        const response = await this.fetch(`${GOOGLE_GEOCODING_URL}?${params}`)
        if (!response.ok) {
            throw new Error('No se pudo validar la zona del punto')
        }

        const data = await response.json()
        if (data.status !== 'OK' || !data.results?.length) {
            throw new Error('No se pudo ubicar uno de los puntos en el mapa')
        }
        return data.results[0]
    }

    assertInPilotZone(address, pointName) {
        const components = address.address_components ?? []
        const department = this.getComponent(components, 'administrative_area_level_1') ?? ''
        const country = this.getComponent(components, 'country', 'short_name')
        const zone = TARIFA_CONFIG.pilotZone
        const dentroDelDepartamento = department
            .toLowerCase()
            .includes(zone.department.toLowerCase())

        if (!dentroDelDepartamento || country !== zone.countryCode) {
            throw new Error(`El punto de ${pointName} está fuera de la zona piloto`)
        }
    }

    getComponent(components, type, nameType = 'long_name') {
        return components.find((component) => component.types.includes(type))?.[nameType]
    }

    async getRoute(origin, destination) {
        const response = await this.fetch(GOOGLE_ROUTES_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': this.apiKey,
                'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'
            },
            body: JSON.stringify({
                origin: {
                    location: {
                        latLng: {
                            latitude: origin.latitude,
                            longitude: origin.longitude
                        }
                    }
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: destination.latitude,
                            longitude: destination.longitude
                        }
                    }
                },
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE'
            })
        })

        if (!response.ok) {
            throw new Error('Google Maps no pudo calcular la ruta')
        }

        const data = await response.json()
        const route = data.routes?.[0]
        if (!route?.distanceMeters || !route.duration) {
            throw new Error('No existe una ruta disponible entre los puntos')
        }

        return {
            distanceMeters: route.distanceMeters,
            durationSeconds: Number.parseInt(route.duration, 10),
            polyline: route.polyline?.encodedPolyline ?? null
        }
    }
}
