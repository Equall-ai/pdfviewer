import adapter from '@sveltejs/adapter-node';
import { sveltePreprocess } from 'svelte-preprocess';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: [
    sveltePreprocess({
      defaults: { style: 'postcss' },
      postcss: { configFilePath: join(__dirname, 'postcss.config.cjs') },
      typescript: {
        tsconfigFile: './tsconfig.json'
      }
    })
  ],
  onwarn: (warning, handler) => {
    if (warning.code === 'css-unused-selector' || warning.code.startsWith('a11y-')) {
      return;
    }
    handler(warning);
  },
  kit: {
    env: {
      publicPrefix: 'PUBLIC_'
    },
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      $routes: './src/routes',
      '$routes/*': './src/routes/*'
    }
  },
  vitePlugin: {
    // Enable Svelte Inspector
    inspector: true
  },
  compilerOptions: {
    accessors: true
  }
};

export default config;
