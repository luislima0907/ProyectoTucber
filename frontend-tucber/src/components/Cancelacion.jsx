import { useState } from 'react'

export function Cancelacion({ isOpen, onClose, onConfirm, isSubmitting, error, rol = 'conductor' }) {
    const [reason, setReason] = useState('')

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onConfirm(reason)
    }

    return (
        <div style={overlayStyle}>
            <div style={containerStyle} role="dialog" aria-modal="true" aria-labelledby="cancel-title">
                <h3 id="cancel-title" style={{ marginTop: 0, color: 'var(--text-main)' }}>
                    ¿Confirmar cancelación del viaje?
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    {rol === 'cliente'
                        ? 'Al cancelar la solicitud, se detendrá la búsqueda de conductor o se notificará al asignado.'
                        : 'Al cancelar, la solicitud regresará al listado disponible o se informará al cliente.'}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="cancel-reason">Motivo de cancelación (opcional):</label>
                        <textarea
                            id="cancel-reason"
                            rows="3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Escribe el motivo aquí..."
                            disabled={isSubmitting}
                            className="form-input"
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {error && (
                        <div className="error-msg" role="alert" style={{ marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="solicitudes-boton-secundario"
                        >
                            Volver sin cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1
                            }}
                        >
                            {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
}

const containerStyle = {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 12px 32px rgba(0, 70, 50, 0.15)'
}