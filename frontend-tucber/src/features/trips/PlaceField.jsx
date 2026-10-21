import { useEffect, useId, useRef, useState } from 'react'
import { loadMapsLibrary } from '../../config/maps'

export function PlaceField({ label, value, onSelect }) {
    const id = useId()
    const session = useRef(null)
    const [query, setQuery] = useState(null)
    const [suggestions, setSuggestions] = useState([])
    const [error, setError] = useState('')

    useEffect(() => {
        if (!query || query.length < 3) return
        let active = true
        const timer = setTimeout(async () => {
            try {
                const { AutocompleteSuggestion, AutocompleteSessionToken } =
                    await loadMapsLibrary('places')
                session.current ||= new AutocompleteSessionToken()
                const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input: query,
                    sessionToken: session.current,
                    includedRegionCodes: ['gt'],
                    locationBias: { center: { lat: 14.6347, lng: -89.9889 }, radius: 15000 },
                })
                if (active) {
                    setSuggestions(result.suggestions)
                    setError('')
                }
            } catch {
                if (active) setError('La búsqueda no está disponible. Elige el punto en el mapa.')
            }
        }, 300)
        return () => {
            active = false
            clearTimeout(timer)
        }
    }, [query])

    async function select(prediction) {
        try {
            const place = prediction.toPlace()
            await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
            if (!place.location) return
            onSelect({
                latitude: place.location.lat(),
                longitude: place.location.lng(),
                description: place.displayName || place.formattedAddress,
            })
            setQuery(null)
            setSuggestions([])
            session.current = null
        } catch {
            setError('No se pudo seleccionar el lugar. Intenta con el mapa.')
        }
    }

    return (
        <div className="place-field">
            <label className="field-label" htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                value={query === null ? value?.description || '' : query}
                placeholder={label}
                autoComplete="off"
                onChange={(event) => {
                    setQuery(event.target.value)
                    setSuggestions([])
                    onSelect(null)
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') setSuggestions([])
                }}
            />
            {suggestions.length > 0 && (
                <ul className="place-suggestions" aria-label={`Sugerencias de ${label}`}>
                    {suggestions.map(({ placePrediction }) => (
                        <li key={placePrediction.placeId}>
                            <button type="button" onClick={() => select(placePrediction)}>
                                {placePrediction.text.toString()}
                            </button>
                        </li>
                    ))}
                    <li className="places-attribution">
                        <img
                            src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                            alt="Powered by Google"
                        />
                    </li>
                </ul>
            )}
            {error && <small role="status">{error}</small>}
        </div>
    )
}
