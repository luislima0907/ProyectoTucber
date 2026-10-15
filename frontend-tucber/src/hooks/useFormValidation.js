import {useState, useCallback} from 'react'

export const useFormValidation = (initialValues = {}, validators = {}) => {
    const [values, setValues] = useState(initialValues)
    const [errors, setErrors] = useState({})
    const [touched, setTouched] = useState({})

    const validateField = useCallback((name, value) => {
        const startTime = performance.now()

        let errorMsg = null
        if (validators[name]) {
            errorMsg = validators[name](value, values)
        }

        const endTime = performance.now()
        if (endTime - startTime > 300) {
            console.warn(`Validación de ${name} tomó ${(endTime - startTime).toFixed(2)} ms`)
        }

        setErrors(prev =>{
            const newErrors = {...prev}
            if (errorMsg) {
                newErrors[name] = errorMsg
            } else {
                delete newErrors[name]
            }
            return newErrors
        })

        return errorMsg
    }, [validators, values])

    const handlChange = (e) => {
        const { name, value } = e.target
        setValues(prev => ({ ...prev, [name]: value }))

        if (touched[name]) {
            validateField(name, value)
        }
    }

    const handleBlur = (e) => {
        const { name, value } = e.target
        setTouched(prev => ({ ...prev, [name]: true }))
        validateField(name, value)
    }

    const validateAll = () => {
        const newErrors = {}
        let firstInvalidField = null

        Object.keys(validators).forEach(field => {
            const error = validators[field](values[field], values)
            if (error){
                newErrors[field] = error
                if (!firstInvalidField) firstInvalidField = field
            }
        })

        setErrors(newErrors)

        const allTouched = Object.keys(validators).reduce((acc, key) => ({ ...acc, [key]: true }), {})
        setTouched(allTouched)

        if (firstInvalidField) {
            const inputElement = document.querySelector(`[name="${firstInvalidField}"]`)
            if (inputElement) inputElement.focus()
        }

        return Object.keys(newErrors).length === 0
    }

    const handleBackendErrors = (err) => {
        const responseData = err?.response?.data
        if (responseData?.fields && typeof responseData.fields === 'object') {
            setErrors(prev => ({ ...prev, ...responseData.fields }))
            const firstBackendErrorKey = Object.keys(responseData.fields)[0]
            if (firstBackendErrorKey) {
                const el = document.querySelector(`[name="${firstBackendErrorKey}"]`)
                if (el) el.focus()
            }
        } else {
            const genericMsg = responseData?.message || err?.message || 'Ocurrio un error inesperado'
            setErrors(prev => ({...prev, _general: genericMsg}))
        }
    }

    return {
        values,
        setValues,
        errors,
        setErrors,
        touched,
        handlChange,
        handleBlur,
        validateAll,
        handleBackendErrors
    }
}