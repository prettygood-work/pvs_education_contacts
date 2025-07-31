import { validateConfig } from './config';
import { CDELoader } from './loaders/cdeLoader';
import * as firebase from './utils/firebase';

async function main() {
  try {
    console.log('Loading CDE district data...');
    
    validateConfig();
    firebase.initializeFirebase();
    
    const loader = new CDELoader();
    const districts = await loader.loadDistricts();
    
    console.log(`Found ${districts.length} districts`);
    
    await firebase.saveDistricts(districts);
    
    console.log('Districts loaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error loading districts:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}