import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Two ways to reach the phone:
//   yarn dev            -> HTTPS on the LAN (self-signed). Use when the phone can hit this
//                          machine directly. iOS needs HTTPS for motion sensors, hence the cert.
//   NO_SSL=1 yarn dev   -> plain HTTP, meant to sit behind a tunnel (e.g. cloudflared) that
//                          terminates HTTPS for us. The phone still gets a secure context from
//                          the tunnel URL, so motion sensors work.
const useSsl = !process.env.NO_SSL;

export default defineConfig({
  plugins: useSsl ? [basicSsl()] : [],
  server: {
    host: true,
    port: 8443,
    // Tunnel hostnames (e.g. *.trycloudflare.com) differ from localhost; allow them.
    allowedHosts: true,
  },
});
