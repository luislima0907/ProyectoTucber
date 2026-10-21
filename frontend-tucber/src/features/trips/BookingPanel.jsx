import { useRef, useState } from 'react'
import { PlaceField } from './PlaceField'
import { TripMap } from './TripMap'
import { tripService, getErrorMessage, formatMoney } from '../../services/tripService'

export function BookingPanel({ onCreated }) {
    const [origin, setOrigin] = useState(null)
    const [destination, setDestination] = useState(null)
    const [point, setPoint] = useState('origin')
    const [reference, setReference] = useState('')
    const [quote, setQuote] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const attempt = useRef(null)
    const pending = useRef(false)

    function selectPoint(type, value) {
        if (type === 'origin') setOrigin(value)
        else setDestination(value)
        setQuote(null)
        attempt.current = null
        setError('')
    }

    async function submit(event) {
        event.preventDefault()
        if (pending.current) return
        pending.current = true
        setBusy(true)
        setError('')
        try {
            if (!quote) setQuote(await tripService.quote(origin, destination))
            else {
                attempt.current ||= crypto.randomUUID()
                const trip = await tripService.create({
                    origin,
                    destination,
                    reference,
                    idempotencyKey: attempt.current,
                })
                onCreated(trip)
            }
        } catch (failure) {
            setError(getErrorMessage(failure))
        } finally {
            pending.current = false
            setBusy(false)
        }
    }

    function locate() {
        navigator.geolocation?.getCurrentPosition(
            (position) => {
                selectPoint('origin', {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    description: 'Mi ubicación',
                })
            },
            () => setError('Selecciona tu recogida en el mapa o búscala por nombre.'),
        )
    }

    return (
        <div className="ride-layout">
            <section className="ride-panel">
                <h1>¿A dónde vamos?</h1>
                <p className="muted">Un viaje por Jalapa empieza aquí.</p>
                <form onSubmit={submit}>
                    <PlaceField
                        label="Punto de recogida"
                        value={origin}
                        onSelect={(value) => selectPoint('origin', value)}
                    />
                    <button className="text-button" type="button" onClick={locate}>
                        Usar mi ubicación
                    </button>
                    <PlaceField
                        label="Destino"
                        value={destination}
                        onSelect={(value) => selectPoint('destination', value)}
                    />
                    <label className="form-group">
                        Referencia de recogida
                        <input
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            placeholder="Frente a la entrada, por ejemplo"
                            maxLength={250}
                        />
                    </label>
                    <fieldset className="point-picker">
                        <legend>También puedes elegir en el mapa</legend>
                        <label>
                            <input
                                type="radio"
                                name="point"
                                checked={point === 'origin'}
                                onChange={() => setPoint('origin')}
                            />{' '}
                            Recogida
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="point"
                                checked={point === 'destination'}
                                onChange={() => setPoint('destination')}
                            />{' '}
                            Destino
                        </label>
                    </fieldset>
                    {quote && (
                        <div className="quote-summary">
                            <div>
                                <span>Tu tarifa en efectivo</span>
                                <strong>{formatMoney(quote.amount)}</strong>
                            </div>
                            <p>
                                {(quote.distanceMeters / 1000).toFixed(1)} km de recorrido · Precio
                                acordado
                            </p>
                        </div>
                    )}
                    {error && (
                        <p className="error-msg" role="alert">
                            {error}
                        </p>
                    )}
                    <button className="primary-button" disabled={!origin || !destination || busy}>
                        {busy ? 'Procesando…' : quote ? 'Buscar conductor' : 'Ver tarifa del viaje'}
                    </button>
                    <p className="form-note">El pago se realiza en efectivo al finalizar.</p>
                </form>
            </section>
            <TripMap
                origin={origin}
                destination={destination}
                route={quote?.polyline}
                onSelect={(value) => selectPoint(point, value)}
            />
        </div>
    )
}
