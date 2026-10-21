import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL } from '../config/api'
import { getAccessToken } from '../config/auth'

export function useSearchEngine() {
    const socket = useRef(null)
    const [trip, setTrip] = useState(null)
    const [driverLocation, setDriverLocation] = useState(null)
    const [requests, setRequests] = useState([])
    const [connected, setConnected] = useState(false)
    const [restoring, setRestoring] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        let reconnect
        function connect() {
            const url = new URL(API_URL, window.location.origin)
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
            url.pathname = '/search'
            const token = getAccessToken()
            if (!token) return
            const connection = new WebSocket(url, ['tucber', token])
            socket.current = connection
            connection.onopen = () => {
                if (active) setConnected(true)
            }
            connection.onmessage = (event) => {
                if (!active) return
                const { type, data } = JSON.parse(event.data)
                if (type === 'trip') {
                    setTrip(data)
                    setDriverLocation((location) =>
                        data?.id === location?.tripId &&
                        ['aceptada', 'en_recogida', 'en_curso'].includes(data?.status)
                            ? location
                            : null,
                    )
                    setRestoring(false)
                }
                if (type === 'trip-location') setDriverLocation(data)
                if (type === 'requests') setRequests(data)
                if (type === 'error') {
                    setError(data.message)
                    setRestoring(false)
                }
            }
            connection.onclose = () => {
                if (!active) return
                setConnected(false)
                reconnect = setTimeout(connect, 2000)
            }
        }
        connect()
        return () => {
            active = false
            clearTimeout(reconnect)
            socket.current?.close()
        }
    }, [])

    const send = useCallback((type, data = {}) => {
        if (socket.current?.readyState !== WebSocket.OPEN) {
            setError('Se perdió la conexión. Estamos reconectando.')
            return false
        }
        setError('')
        socket.current.send(JSON.stringify({ type, ...data }))
        return true
    }, [])

    return { trip, setTrip, driverLocation, requests, connected, restoring, error, setError, send }
}
