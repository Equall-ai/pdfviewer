import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type User = {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  id: string;
  lastName?: string;
  profilePictureUrl?: string;
  updatedAt: string;
};

export type EquallUser = {
  expires_at: string;
};

export type Session = {
  user: User;
  equallUser: EquallUser;
  impersonator: any;
  accessToken: string;
};

export const user = writable<User | undefined>(undefined);
export const session = writable<Session | undefined>(undefined);

export const THEME_OPTIONS = ['light', 'dark', 'high-contrast'] as const;
export type ThemeOptions = (typeof THEME_OPTIONS)[number];

export const systemTheme = (() => {
  const { subscribe, set: originalSet } = writable<ThemeOptions>('light');

  return {
    subscribe,
    set: (value: ThemeOptions) => {
      if (browser) {
        if (value === 'dark') {
          document.cookie = 'theme=dark;path=/';
          document.body.classList.remove('high-contrast');
          document.body.classList.add('dark');
        } else if (value === 'high-contrast') {
          document.cookie = 'theme=high-contrast;path=/';
          document.body.classList.remove('dark');
          document.body.classList.add('high-contrast');
        } else {
          document.cookie = 'theme=light;path=/';
          document.body.classList.remove('dark');
          document.body.classList.remove('high-contrast');
        }
      }
      originalSet(value);
    }
  };
})();
