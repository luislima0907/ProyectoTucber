import {useState, useCallback} from 'react';

export const useAsyncAction = (asyncFuction) => {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState(null)

    const execute = useCallback(async (...args) => {
        if (isProcessing) return

        setIsProcessing(true)
        setError(null)

        try {
            const result = await asyncFuction(...args)
            return result
        } catch (err) {
            setError(err)
            throw err
        } finally {
            setIsProcessing(false)
        }
    }, [asyncFuction, isProcessing])
    
    return { execute, isProcessing, error, setError }
}