const TOKEN_KEY = 'tucber.accessToken'

export function getAccessToken() {
    return sessionStorage.getItem(TOKEN_KEY)
}

export function saveAccessToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
    sessionStorage.removeItem(TOKEN_KEY)
}
