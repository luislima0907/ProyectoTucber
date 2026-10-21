export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(
                new Error(
                    'Este navegador no permite obtener tu ubicación. Elige el punto en el mapa.',
                ),
            )
            return
        }

        let bestPosition
        let watchId
        const timeout = setTimeout(() => finish(), 12000)

        function finish(error) {
            clearTimeout(timeout)
            if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
            if (!bestPosition) {
                reject(
                    new Error(
                        error?.code === 1
                            ? 'Permite el acceso a ubicación o elige tu recogida en el mapa.'
                            : 'No se pudo obtener tu ubicación. Puedes elegirla en el mapa.',
                    ),
                )
                return
            }
            const { latitude, longitude, accuracy } = bestPosition.coords
            resolve({ latitude, longitude, accuracy, description: 'Mi ubicación' })
        }

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                    bestPosition = position
                }
                if (position.coords.accuracy <= 30) finish()
            },
            (error) => finish(error),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
        )
    })
}
