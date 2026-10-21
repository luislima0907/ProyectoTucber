import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
if (key) setOptions({ key, v: 'weekly', language: 'es', region: 'GT' })

export async function loadMapsLibrary(name) {
    if (!key) throw new Error('El mapa no está disponible. Intenta más tarde.')
    return importLibrary(name)
}
