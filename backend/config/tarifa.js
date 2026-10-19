export const TARIFA_CONFIG = {
    currency: 'GTQ',
    currencySymbol: 'Q',
    pilotZone: {
        municipality: 'Jalapa',
        department: 'Jalapa',
        countryCode: 'GT'
    },
    minimum: 3,
    maximum: 20,
    distanceBands: [
        { upToKm: 2, amount: 3 },
        { upToKm: 5, amount: 6 },
        { upToKm: 10, amount: 10 },
        { upToKm: 15, amount: 15 },
        { upToKm: Number.POSITIVE_INFINITY, amount: 20 }
    ]
}

export function calcularTarifa(distanceMeters) {
    const distanceKm = distanceMeters / 1000
    const band = TARIFA_CONFIG.distanceBands.find(({ upToKm }) => distanceKm <= upToKm)
    const amount = band?.amount ?? TARIFA_CONFIG.maximum

    return {
        distanceKm: Number(distanceKm.toFixed(2)),
        amount: Math.min(TARIFA_CONFIG.maximum, Math.max(TARIFA_CONFIG.minimum, amount)),
        currency: TARIFA_CONFIG.currency,
        currencySymbol: TARIFA_CONFIG.currencySymbol
    }
}
