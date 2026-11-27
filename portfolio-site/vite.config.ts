import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleNotesApi } from './server/notes-api.mjs';

function notesApiPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      try {
        const handled = await handleNotesApi(req, res);
        if (!handled) next();
      } catch (err) {
        next(err);
      }
    });
  };

  return {
    name: 'om-notes-api',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), notesApiPlugin()],
});
