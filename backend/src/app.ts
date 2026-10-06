import { createServer } from 'http';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { connectDb } from './config/db';
import api from './routes';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/errorHandler';
import { attachSockets } from './sockets';

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false })); // CSP relaxed only for the static admin page below
app.use(cors());
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));
app.use(express.json({ limit: '4mb' })); // allows base64 photo uploads
app.use('/api', apiLimiter, api);
app.use(notFound);
app.use(errorHandler);

async function main() {
  await connectDb();
  const server = createServer(app);
  app.locals.io = attachSockets(server);
  server.listen(env.PORT, '0.0.0.0', () => console.log(`KULBANDHAN API + Socket.IO on :${env.PORT}  |  Admin panel: http://localhost:${env.PORT}/admin`));
}
main().catch((e) => { console.error(e); process.exit(1); });

export default app;
