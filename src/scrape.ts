import { validateConfig } from './config';
import { Orchestrator } from './orchestrator';

async function main() {
  try {
    console.log('Starting PVS Email Scraper...');
    
    validateConfig();
    
    const orchestrator = new Orchestrator();
    await orchestrator.run();
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}