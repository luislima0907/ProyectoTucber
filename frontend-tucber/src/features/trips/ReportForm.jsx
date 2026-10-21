import { useState } from 'react'
import { tripService, getErrorMessage } from '../../services/tripService'

export function ReportForm({ tripId }) {
    const [open, setOpen] = useState(false)
    const [description, setDescription] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        try {
            const report = await tripService.action(tripId, 'reportar', { description })
            setMessage(`Reporte ${report.id} recibido.`)
            setOpen(false)
        } catch (failure) { setMessage(getErrorMessage(failure)) }
        finally { setBusy(false) }
    }
    return <div className="report-area">
        <button className="text-button" onClick={() => setOpen(!open)}>Reportar un problema</button>
        {open && <form onSubmit={submit}>
            <label className="form-group">¿Qué pasó?<textarea value={description} onChange={event => setDescription(event.target.value)} required maxLength={1000} /></label>
            <p className="form-note">Este reporte no es un servicio de emergencia.</p>
            <button className="secondary-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar reporte'}</button>
        </form>}
        {message && <p role="status">{message}</p>}
    </div>
}
