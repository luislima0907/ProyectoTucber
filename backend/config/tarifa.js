export const TARIFA_CONFIG = {
    currency: 'GTQ',
    currencySymbol: 'Q',
    pilotZone: {
        department: 'Jalapa',
        countryCode: 'GT'
    },
    minimum: 5,
    maximum: 25,
    distanceBands: [
        { upToKm: 2, amount: 5 },
        { upToKm: 5, amount: 10 },
        { upToKm: 8, amount: 15 },
        { upToKm: 12, amount: 20 },
        { upToKm: Number.POSITIVE_INFINITY, amount: 25 }
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
