import { DB_PATH } from './config.ts';
import { resetDemoData } from './seed.ts';

resetDemoData();
console.log(`Demo data reset in ${DB_PATH}`);
console.log('Everyone has been signed out; refresh the app to start fresh.');
