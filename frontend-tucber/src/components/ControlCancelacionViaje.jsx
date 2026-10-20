import { useState } from 'react'
import { Cancelacion } from './Cancelacion'
import { driverService } from '../services/driverService'
import { passengerService } from '../services/passengerService'

export function ControlCancelacionViaje({ viaje, rol = 'conductor', onCancelacionExitosa, onIrAReporteFE22 }) {
    const [showCancelacion, setShowCancelacion] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorCancel, setErrorCancel] = useState('')
    const [estadoViaje, setEstadoViaje] = useState(viaje?.status || viaje?.estado || 'ASIGNADO')

    const permiteCancelacion = ['BUSCANDO', 'ASIGNADO', 'LLEGADA', 'PENDING'].includes(estadoViaje)

    const handleConfirmarCancelacion = async (motivo) => {
        setIsSubmitting(true)
        setErrorCancel('')

        const servicio = rol === 'conductor' ? driverService : passengerService

        try {
            const res = await servicio.cancelTrip(viaje.id, motivo)

            if (res?.status === 'CANCELLED' || res?.estado === 'CANCELADO') {
                setShowCancelacion(false)
                if (onCancelacionExitosa) onCancelacionExitosa(viaje.id)
            }
        } catch (err) {
            const statusErr = err.response?.status
            const mensajeErr = err.response?.data?.message || err.response?.data?.error || ''

            if (statusErr === 400 && (mensajeErr.includes('iniciado') || mensajeErr.includes('IN_PROGRESS'))) {
                setEstadoViaje('EN_CURSO')
                setShowCancelacion(false)
            } else if (err.code === 'ECONNABORTED' || !err.response) {
                try {
                    const checkStatus = await servicio.getTripStatus(viaje.id)
                    if (checkStatus?.status === 'CANCELLED' || checkStatus?.estado === 'CANCELADO') {
                        setShowCancelacion(false)
                        if (onCancelacionExitosa) onCancelacionExitosa(viaje.id)
                        return
                    }
                } catch {
                    // 
                }
                setErrorCancel('Error de conexión o timeout. Mantenemos el motivo para que reintentes.')
            } else {
                setErrorCancel(mensajeErr || 'No fue posible cancelar el viaje.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div style={{ marginTop: '1rem' }}>
            {estadoViaje === 'EN_CURSO' ? (
                <div style={{ backgroundColor: '#fef3c7', padding: '1rem', borderRadius: '12px' }}>
                    <p style={{ color: '#b45309', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                        El viaje ya está en curso. Para inconvenientes, envía un reporte de problema.
                    </p>
                    <button
                        type="button"
                        className="solicitudes-boton-secundario"
                        style={{ marginTop: '0.75rem' }}
                        onClick={() => onIrAReporteFE22?.(viaje.id)}
                    >
                        Reportar un problema (FE-22)
                    </button>
                </div>
            ) : permiteCancelacion ? (
                <button
                    type="button"
                    style={{
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                    onClick={() => setShowCancelacion(true)}
                >
                    Cancelar viaje
                </button>
            ) : null}

            <Cancelacion
                isOpen={showCancelacion}
                onClose={() => {
                    setShowCancelacion(false)
                    setErrorCancel('')
                }}
                onConfirm={handleConfirmarCancelacion}
                isSubmitting={isSubmitting}
                error={errorCancel}
                rol={rol}
            />
        </div>
    )
}