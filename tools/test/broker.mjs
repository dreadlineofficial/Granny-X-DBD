import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const aedes = require('aedes')(); const { createServer } = require('aedes-server-factory');
createServer(aedes, { ws: true }).listen(8883, () => console.log('broker up'));
