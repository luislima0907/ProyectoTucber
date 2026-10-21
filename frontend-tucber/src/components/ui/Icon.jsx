const paths = {
    ride: 'M3 13l2-7h14l2 7M5 13h14v6H5zM7 19v2m10-2v2M7 16h2m6 0h2',
    history: 'M3 12a9 9 0 1 0 3-6M3 3v6h6m3-3v6l4 2',
    account: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3',
    logout: 'M9 4H4v16h5m5-12 4 4-4 4m-5-4h12',
    arrow: 'M5 12h14m-6-6 6 6-6 6'
}
export function Icon({ name }) {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.ride} /></svg>
}
