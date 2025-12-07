/**
 * State daemon CLI
 */

import { StateDaemonServer } from './server';

const port = process.env.KB_STATE_DAEMON_PORT
  ? parseInt(process.env.KB_STATE_DAEMON_PORT, 10)
  : 7777;

const host = process.env.KB_STATE_DAEMON_HOST ?? 'localhost';

const server = new StateDaemonServer({ port, host });

server.start().catch((error) => {
  console.error('Failed to start state daemon:', error);
  process.exit(1);
});
