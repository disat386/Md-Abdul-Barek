/**
 * entry point for hosting environments like Hostinger
 */
console.log('--- Auurio App Starting ---');
console.log('Current CWD:', process.cwd());

// Force production mode if we are running the bundled version
process.env.NODE_ENV = 'production';
console.log('Environment forced to:', process.env.NODE_ENV);

import './dist/server.js';
