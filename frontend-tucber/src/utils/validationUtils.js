export const validateEmail = (email) => {
    if (!email || !email.trim()) return 'El correo electrónico es obligatorio'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) return 'El correo electrónico no es válido'
    return null
}

export const validatePassword = (password, minLength = 8) => {
    if (!password) return 'La contraseña es obligatoria'
    if (password.length < minLength) return `La contraseña debe tener al menos ${minLength} caracteres`
    return null
}

export const validatePin = (pin) => {
    if (!pin) return 'El PIN es obligatorio'
    const pinRegex = /^\d{4}$/
    if (!pinRegex.test(String(pin))) return 'El PIN debe ser un número de 4 dígitos'
    return null
}

export const validateRequired= (value, fieldName = 'Este campo') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} es obligatorio`
    }
    return null
}

export const validatePhone = (phone) => {
    if (!phone || !phone.trim()) return 'El teléfono es obligatorio'
    const phoneRegex = /^\d{8}$/
    if (!phoneRegex.test(phone.trim())) return 'El teléfono debe tener 8 dígitos (sin el +502)'
    return null
}

export const validateRole = (role) => {
    const allowedRoles = ['cliente', 'conductor']
    if (!allowedRoles.includes(role))
        return 'Selecciona un rol válido (viajar o conductor).'
    return null
}

export const validateCapacity = (capacity) => {
    const num = Number(capacity)
    if (isNaN(num) || num < 1 || num > 5) return 'La capacidad debe ser un número entre 1 y 5 pasajeros'
    return null
}

export const validateRating = (rating) => {
    const num = Number (rating)
    if (isNaN(num) || num < 1 || num > 5) return 'La calificación debe ser un número entre 1 y 5 estrellas'
    return null
}

export const validateReport = (reason, description) => {
    const errors = {}
    if (!reason || !reason.trim()) errors.reason = 'El motivo del reporte es obligatorio'
    if (!description || description.trim().length < 10)
        errors.description = 'La descripción del reporte debe tener al menos 10 caracteres'
    return errors
}