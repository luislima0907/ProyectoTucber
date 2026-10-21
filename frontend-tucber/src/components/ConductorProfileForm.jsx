
import { useEffect, useState } from 'react'
import { driverService } from '../services/driverService'
import { API_URL } from '../config/api'

export function ConductorProfileForm() {
    const [formData, setFormData] = useState({
        placa: '',
        color: '',
        capacidad: '',
        telefono: ''
    })

    const [errors, setErrors] = useState({})
    const [photo, setPhoto] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)
    const [savedPhotoUrl, setSavedPhotoUrl] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState('')

    function getPhotoUrl(path) {
        if (!path) return null

        const baseUrl = API_URL.replace(/\/$/, '')
        const photoPath = path.startsWith('/api/')
            ? path.slice(4)
            : path

        return `${baseUrl}${photoPath}`
    }

    useEffect(() => {
        if (!photo) {
            setPhotoPreview(null)
            return
        }

        const previewUrl = URL.createObjectURL(photo)
        setPhotoPreview(previewUrl)

        return () => URL.revokeObjectURL(previewUrl)
    }, [photo])

    useEffect(() => {
        let active = true

        async function loadProfile() {
            try {
                const perfil = await driverService.getProfile()

                if (!active) return

                setFormData({
                    placa: perfil.placa ?? '',
                    color: perfil.color ?? '',
                    capacidad: perfil.capacidad ?? '',
                    telefono: perfil.telefono ?? ''
                })

                setSavedPhotoUrl(getPhotoUrl(perfil.foto))
                setLoadError('')
            } catch (error) {
                if (!active) return

                setLoadError(
                    'No se pudo cargar el perfil del conductor.'
                )
            } finally {
                if (active) {
                    setIsLoading(false)
                }
            }
        }

        loadProfile()

        return () => {
            active = false
        }
    }, [])

    function handleChange(event) {
        const { name, value } = event.target

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        setErrors(prev => ({
            ...prev,
            [name]: ''
        }))

        setSaveError('')
        setSaveSuccess('')
    }

    function handlePhotoChange(event) {
        const file = event.target.files?.[0]

        if (!file) return

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setErrors(prev => ({
                ...prev,
                foto: 'La fotografía debe ser JPG o PNG'
            }))

            event.target.value = ''
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({
                ...prev,
                foto: 'La fotografía no puede superar los 5 MB'
            }))

            event.target.value = ''
            return
        }

        setPhoto(file)

        setErrors(prev => ({
            ...prev,
            foto: ''
        }))

        setSaveError('')
        setSaveSuccess('')
    }

    function validateForm() {
        const newErrors = {}

        const placa = formData.placa.trim()
        const color = formData.color.trim()
        const capacidad = Number(formData.capacidad)
        const telefono = formData.telefono.trim()

        if (!/^[A-Za-z0-9]{4,10}$/.test(placa)) {
            newErrors.placa =
                'La placa debe tener entre 4 y 10 caracteres, solo letras y números'
        }

        if (color.length < 3 || color.length > 30) {
            newErrors.color =
                'El color debe tener entre 3 y 30 caracteres'
        }

        if (
            formData.capacidad === '' ||
            !Number.isInteger(capacidad) ||
            capacidad < 1 ||
            capacidad > 5
        ) {
            newErrors.capacidad =
                'La capacidad debe ser un número entero entre 1 y 5'
        }

        if (!/^\+?\d{7,15}$/.test(telefono)) {
            newErrors.telefono =
                'El teléfono debe tener entre 7 y 15 dígitos'
        }

        if (errors.foto) {
            newErrors.foto = errors.foto
        }

        setErrors(newErrors)

        return Object.keys(newErrors).length === 0
    }

    async function handleSubmit(event) {
        event.preventDefault()

        if (isSaving || isLoading) return

        setSaveError('')
        setSaveSuccess('')

        if (!validateForm()) return

        const data = new FormData()

        data.append('placa', formData.placa.trim())
        data.append('color', formData.color.trim())
        data.append('capacidad', formData.capacidad)
        data.append('telefono', formData.telefono.trim())

        if (photo) {
            data.append('foto', photo)
        }

        setIsSaving(true)

        try {
            const perfil = await driverService.saveProfile(data)

            setFormData({
                placa: perfil.placa ?? formData.placa,
                color: perfil.color ?? formData.color,
                capacidad: perfil.capacidad ?? formData.capacidad,
                telefono: perfil.telefono ?? formData.telefono
            })

            if (perfil.foto) {
                setSavedPhotoUrl(
                    `${getPhotoUrl(perfil.foto)}?t=${Date.now()}`
                )
            }

            setSaveSuccess(
                'Los datos del vehículo se guardaron correctamente.'
            )

            setLoadError('')
            setErrors({})
        } catch (error) {
            const message = error.response?.data?.message

            setSaveError(
                typeof message === 'string'
                    ? message
                    : 'No se pudo guardar el perfil. Inténtalo nuevamente.'
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <section>
            <h2>Perfil del conductor</h2>

            {isLoading && (
                <p className="subtitle">Cargando perfil...</p>
            )}

            {loadError && (
                <p className="error-msg">{loadError}</p>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label
                        htmlFor="placa"
                        className={errors.placa ? 'label-error' : ''}
                    >
                        Placa del vehículo
                    </label>

                    <input
                        id="placa"
                        name="placa"
                        type="text"
                        className={`form-input ${errors.placa ? 'input-error' : ''}`}
                        value={formData.placa}
                        onChange={handleChange}
                        placeholder="Ej. P123ABC"
                        maxLength={10}
                        disabled={isSaving || isLoading}
                    />

                    {errors.placa && (
                        <span className="field-error-msg">
                            {errors.placa}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label
                        htmlFor="color"
                        className={errors.color ? 'label-error' : ''}
                    >
                        Color del vehículo
                    </label>

                    <input
                        id="color"
                        name="color"
                        type="text"
                        className={`form-input ${errors.color ? 'input-error' : ''}`}
                        value={formData.color}
                        onChange={handleChange}
                        placeholder="Ej. Blanco"
                        maxLength={30}
                        disabled={isSaving || isLoading}
                    />

                    {errors.color && (
                        <span className="field-error-msg">
                            {errors.color}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label
                        htmlFor="capacidad"
                        className={errors.capacidad ? 'label-error' : ''}
                    >
                        Capacidad de pasajeros
                    </label>

                    <input
                        id="capacidad"
                        name="capacidad"
                        type="number"
                        min="1"
                        max="5"
                        step="1"
                        className={`form-input ${errors.capacidad ? 'input-error' : ''}`}
                        value={formData.capacidad}
                        onChange={handleChange}
                        disabled={isSaving || isLoading}
                    />

                    {errors.capacidad && (
                        <span className="field-error-msg">
                            {errors.capacidad}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label
                        htmlFor="telefono"
                        className={errors.telefono ? 'label-error' : ''}
                    >
                        Teléfono de contacto
                    </label>

                    <input
                        id="telefono"
                        name="telefono"
                        type="tel"
                        className={`form-input ${errors.telefono ? 'input-error' : ''}`}
                        value={formData.telefono}
                        onChange={handleChange}
                        placeholder="Ej. +50212345678"
                        maxLength={16}
                        disabled={isSaving || isLoading}
                    />

                    {errors.telefono && (
                        <span className="field-error-msg">
                            {errors.telefono}
                        </span>
                    )}
                </div>

                <div className="form-group">
                    <label
                        htmlFor="foto"
                        className={errors.foto ? 'label-error' : ''}
                    >
                        Fotografía del vehículo
                    </label>

                    <input
                        id="foto"
                        name="foto"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handlePhotoChange}
                        disabled={isSaving || isLoading}
                        style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            opacity: 0,
                            overflow: 'hidden'
                        }}
                    />

                    <label
                        htmlFor="foto"
                        className={`form-input ${errors.foto ? 'input-error' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            cursor: isSaving || isLoading
                                ? 'not-allowed'
                                : 'pointer',
                            padding: '14px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            overflowWrap: 'anywhere'
                        }}
                    >
                        {photo ? photo.name : 'Seleccionar fotografía'}
                    </label>

                    <span className="subtitle">
                        Formatos JPG o PNG. Tamaño máximo de 5 MB.
                    </span>

                    {errors.foto && (
                        <span className="field-error-msg">
                            {errors.foto}
                        </span>
                    )}

                    {(photoPreview || savedPhotoUrl) && (
                        <img
                            src={photoPreview || savedPhotoUrl}
                            alt="Fotografía del vehículo"
                            style={{
                                width: '100%',
                                maxHeight: '220px',
                                objectFit: 'contain',
                                borderRadius: '12px',
                                marginTop: '12px'
                            }}
                        />
                    )}
                </div>

                {saveError && (
                    <p className="error-msg" role="alert">
                        {saveError}
                    </p>
                )}

                {saveSuccess && (
                    <p role="status">
                        {saveSuccess}
                    </p>
                )}

                <button
                    type="submit"
                    className="btn-submit"
                    disabled={isSaving || isLoading}
                >
                    {isSaving ? 'Guardando...' : 'Guardar perfil'}
                </button>
            </form>
        </section>
    )
}
