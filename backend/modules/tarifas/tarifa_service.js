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
            const error = new Error('El backend no tiene configurada la clave de Google Maps')
            error.code = 'UPSTREAM'
            throw error
        }

        const [originAddresses, destinationAddresses] = await Promise.all([
            this.reverseGeocode(origin),
            this.reverseGeocode(destination)
        ])

        this.assertInPilotZone(originAddresses, 'origen')
        this.assertInPilotZone(destinationAddresses, 'destino')

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
            const error = new Error('No se pudo validar la zona del punto')
            error.code = 'UPSTREAM'
            throw error
        }

        const data = await response.json()
        if (data.status !== 'OK' || !data.results?.length) {
            const error = new Error('No se pudo ubicar uno de los puntos en el mapa')
            error.code = 'UPSTREAM'
            throw error
        }
        return data.results
    }

    assertInPilotZone(addresses, pointName) {
        const zone = TARIFA_CONFIG.pilotZone
        const departmentAddresses = addresses.filter((address) =>
            address.types?.includes('administrative_area_level_1')
        )
        const candidates = departmentAddresses.length ? departmentAddresses : addresses
        const isInPilotZone = candidates.some((address) => {
            const components = address.address_components ?? []
            const department = this.getComponent(components, 'administrative_area_level_1') ?? ''
            const country = this.getComponent(components, 'country', 'short_name')
            const isInDepartment = department.toLowerCase().includes(zone.department.toLowerCase())

            return isInDepartment && country === zone.countryCode
        })

        if (!isInPilotZone) {
            const error = new Error(
                `El punto de ${pointName} está fuera de la zona de servicio de ${zone.department}.`
            )
            error.code = 'ZONE'
            throw error
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
            const error = new Error('Google Maps no pudo calcular la ruta')
            error.code = 'UPSTREAM'
            throw error
        }

        const data = await response.json()
        const route = data.routes?.[0]
        if (!route?.distanceMeters || !route.duration) {
            const error = new Error('No existe una ruta disponible entre los puntos')
            error.code = 'UPSTREAM'
            throw error
        }

        return {
            distanceMeters: route.distanceMeters,
            durationSeconds: Number.parseInt(route.duration, 10),
            polyline: route.polyline?.encodedPolyline ?? null
        }
    }
}
