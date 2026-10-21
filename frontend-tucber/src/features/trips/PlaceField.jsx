import { useEffect, useRef, useState } from 'react'
import { loadMapsLibrary } from '../../config/maps'

export function PlaceField({ label, value, onSelect }) {
    const container = useRef(null)
    const selection = useRef(onSelect)
    const [error, setError] = useState('')
    useEffect(() => { selection.current = onSelect }, [onSelect])

    useEffect(() => {
        let active = true
        let widget
        async function initialize() {
            try {
                const { PlaceAutocompleteElement } = await loadMapsLibrary('places')
                if (!active) return
                widget = new PlaceAutocompleteElement({
                    includedRegionCodes: ['gt'],
                    locationBias: { center: { lat: 14.6347, lng: -89.9889 }, radius: 15000 }
                })
                widget.placeholder = label
                widget.setAttribute('aria-label', label)
                widget.addEventListener('gmp-select', async ({ placePrediction }) => {
                    try {
                        const place = placePrediction.toPlace()
                        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
                        if (!active || !place.location) return
                        selection.current({
                            latitude: place.location.lat(), longitude: place.location.lng(),
                            description: place.displayName || place.formattedAddress
                        })
                    } catch {
                        if (active) setError('Selecciona el punto en el mapa.')
                    }
                })
                widget.addEventListener('gmp-error', () => setError('La búsqueda no está disponible. Usa el mapa.'))
                container.current.appendChild(widget)
            } catch {
                if (active) setError('Puedes seleccionar el punto directamente en el mapa.')
            }
        }
        initialize()
        return () => { active = false; widget?.remove() }
    }, [label])

    return (
        <div className="place-field">
            <span className="field-label">{label}</span>
            <div ref={container} />
            {value && <p className="selected-place">{value.description}</p>}
            {error && <small role="status">{error}</small>}
        </div>
    )
}
