import { writable } from 'svelte/store';

export const featureFlags = writable<Record<string, boolean | number | JSON | string>>({});
