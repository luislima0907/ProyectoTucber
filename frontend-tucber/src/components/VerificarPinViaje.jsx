
import { useEffect, useState } from 'react'
import '../css/VerificarPinViaje.css'

export function VerificarPinViaje({ viaje, onVerificar }) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [procesando, setProcesando] = useState(false)
    const [intentosRestantes, setIntentosRestantes] = useState(null)
    const [bloqueadoHasta, setBloqueadoHasta] = useState(null)
    const [segundosRestantes, setSegundosRestantes] = useState(0)
    const [viajeIniciado, setViajeIniciado] = useState(false)

    const pinCompleto = /^\d{4}$/.test(pin)
    const bloqueado = Boolean(bloqueadoHasta && segundosRestantes > 0)

    useEffect(() => {
        if (!bloqueadoHasta) return

        function actualizarTiempo() {
            const segundos = Math.max(
                0,
                Math.ceil((new Date(bloqueadoHasta).getTime() - Date.now()) / 1000)
            )

            setSegundosRestantes(segundos)

            if (segundos === 0) {
                setBloqueadoHasta(null)
                setIntentosRestantes(null)
            }
        }

        actualizarTiempo()

        const intervalo = setInterval(actualizarTiempo, 1000)

        return () => clearInterval(intervalo)
    }, [bloqueadoHasta])

    function cambiarPin(event) {
        const valor = event.target.value.replace(/\D/g, '').slice(0, 4)
        setPin(valor)
        setError('')
    }

    async function verificarPin(event) {
        event.preventDefault()

        if (procesando || bloqueado || viajeIniciado) return

        if (!pinCompleto) {
            setError('Ingresa los cuatro dígitos del PIN.')
            return
        }

        setProcesando(true)
        setError('')

        try {
            const resultado = await onVerificar(viaje.id, pin)

            if (resultado.status === 'en_curso') {
                setViajeIniciado(true)
                setPin('')
                setIntentosRestantes(null)
                setBloqueadoHasta(null)
            } else {
                setError('No se pudo confirmar el inicio del viaje.')
            }
        } catch (err) {
            setPin('')

            const datos = err.response?.data || {}
            const mensaje = datos.message || err.message || 'No se pudo verificar el PIN.'
            const estadoHttp = err.response?.status

            if(!err.response){
                setError( 'No se pudo confirmar la respuesta del servidor.Comprueba el estado del viaje antes de volver a intentarlo.')
            } else if (estadoHttp === 409){
                setError(mensaje)
            } else if (estadoHttp === 400){
                setError(mensaje)
            } else if (estadoHttp === 401 || estadoHttp === 403){
                setError('Tu sesión no permite validar el PIN de este viaje')
            } else {
                setError(mensaje)
            }
        }finally {
            setProcesando(false)
        }
    }

    const minutos = Math.floor(segundosRestantes / 60)
    const segundos = segundosRestantes % 60
    const tiempoFormateado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`

    if (viajeIniciado) {
        return (
            <section className="verificar-pin-confirmacion" role="status">
                <h2>Viaje iniciado correctamente</h2>
                <p>El PIN fue validado y el viaje está en curso.</p>
            </section>
        )
    }

    return (
        <section className="verificar-pin">
            <div className="verificar-pin-informacion">
                <p className="verificar-pin-etiqueta">Confirmación de recogida</p>
                <h2>Confirma a tu pasajero</h2>
                <p>Pídele el PIN cuando haya subido al tuc tuc.</p>

                <div className="verificar-pin-viaje">
                    <h3>Datos del viaje</h3>
                    <p><strong>Pasajero:</strong> {viaje.pasajero}</p>
                    <p><strong>Destino:</strong> {viaje.destino}</p>
                </div>
            </div>

            <form className="verificar-pin-formulario" onSubmit={verificarPin}>
                <h3>Ingresa el PIN de recogida</h3>
                <p>Introduce los cuatro dígitos proporcionados por el pasajero.</p>

                <label htmlFor="pin-viaje">PIN de cuatro dígitos</label>

                <div className="verificar-pin-casillas">
                    {[0, 1, 2, 3].map((indice) => (
                        <span key={indice} aria-hidden="true">
                            {pin[indice] || ''}
                        </span>
                    ))}

                    <input
                        id="pin-viaje"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        maxLength={4}
                        autoComplete="off"
                        value={pin}
                        onChange={cambiarPin}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? 'pin-viaje-error' : undefined}
                        disabled={procesando || bloqueado}
                        required
                    />
                </div>

                {intentosRestantes !== null && !bloqueado && (
                    <p role="status">
                        Intentos restantes: {intentosRestantes}
                    </p>
                )}

                {bloqueado && (
                    <p className="verificar-pin-error" role="status">
                        PIN bloqueado temporalmente. Tiempo restante: {tiempoFormateado}
                    </p>
                )}

                {error && (
                    <p id="pin-viaje-error" className="verificar-pin-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={!pinCompleto || procesando || bloqueado}
                >
                    {procesando
                        ? 'Verificando...'
                        : bloqueado
                            ? 'PIN bloqueado'
                            : 'Verificar PIN e iniciar viaje'}
                </button>
            </form>
        </section>
    )
}
