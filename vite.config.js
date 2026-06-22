import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'node:fs';
import path from 'node:path';

// Two ways to reach the phone:
//   yarn dev            -> HTTPS on the LAN (self-signed). Use when the phone can hit this
//                          machine directly. iOS needs HTTPS for motion sensors, hence the cert.
//   NO_SSL=1 yarn dev   -> plain HTTP, meant to sit behind a tunnel (e.g. cloudflared) that
//                          terminates HTTPS for us. The phone still gets a secure context from
//                          the tunnel URL, so motion sensors work.
const useSsl = !process.env.NO_SSL;

// Dirs that are never experiments, so they stay out of the launcher list.
const IGNORE = new Set(['node_modules', 'references', 'assets', 'ios', 'dist']);

// A tiny mock API the iOS launcher app reads: GET /projects.json -> every top-level
// directory that has an index.html, as { name, path, title }. Scans the repo root
// (process.cwd()), so run `yarn dev` from the root to serve all experiments at /<dir>/.
function projectsApi() {
  const listProjects = () => {
    const root = process.cwd();
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !IGNORE.has(d.name))
      .filter((d) => fs.existsSync(path.join(root, d.name, 'index.html')))
      .map((d) => {
        let title = d.name;
        try {
          const html = fs.readFileSync(path.join(root, d.name, 'index.html'), 'utf8');
          const m = html.match(/<title>([^<]*)<\/title>/i);
          if (m && m[1].trim()) title = m[1].trim();
        } catch { /* fall back to dir name */ }
        return { name: d.name, path: `/${d.name}/`, title };
      });
  };

  return {
    name: 'projects-api',
    configureServer(server) {
      server.middlewares.use('/projects.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ projects: listProjects() }, null, 2));
      });
    },
  };
}

// Build inputs: the root launcher plus every experiment dir that has an index.html.
// Mirrors the dev projectsApi discovery so `yarn build` (root as Vite root) emits a
// single multi-page bundle — `three` is shared across pages, assets are hashed, and
// each experiment lands at dist/<dir>/index.html with its script rewritten to /assets/.
function buildInputs() {
  const root = process.cwd();
  const inputs = { launcher: path.resolve(root, 'index.html') };
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('.') || IGNORE.has(d.name)) continue;
    const html = path.join(root, d.name, 'index.html');
    if (fs.existsSync(html)) inputs[d.name] = html;
  }
  return inputs;
}

export default defineConfig({
  plugins: [...(useSsl ? [basicSsl()] : []), projectsApi()],
  server: {
    host: true,
    port: 8443,
    // Tunnel hostnames (e.g. *.trycloudflare.com) differ from localhost; allow them.
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: buildInputs() },
  },
});
