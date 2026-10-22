import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { siteSettingsPlugin } from './build/site-settings-plugin';

export default defineConfig({
  plugins: [react(), siteSettingsPlugin()],
});
