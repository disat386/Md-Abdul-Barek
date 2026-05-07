/**
 * entry point for hosting environments like Hostinger
 */
console.log('--- Auurio App Starting ---');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Current CWD:', process.cwd());

import './dist/server.js';
