import { useState, useCallback } from 'react';

const STORAGE_KEY = 'app-radar-favorites';

function loadFavorites() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

export function useFavorites() {
    const [favorites, setFavorites] = useState(() => loadFavorites());

    const toggleFavorite = useCallback((trackId) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
            return next;
        });
    }, []);

    const isFavorite = useCallback((trackId) => favorites.has(trackId), [favorites]);

    return { favorites, toggleFavorite, isFavorite };
}
