
/**
  *   Cloud functions callable functions interface.
  * 
  *
  **/

import {httpsCallable, getFunctions} from 'firebase/functions';
import firebaseReady                 from '../firebase.js';


let functions;

const init = async () => {

  const {firebaseApp} = await firebaseReady();

  functions = getFunctions(firebaseApp);
};

// No try catch, forward error out to main thread,
// so developer can take steps to properly handle them.
export default async job => {

  if (!functions) {
    await init();
  }

  const {name, data = {}} = job;
  const callable          = httpsCallable(functions, name);

  const result = await callable(data);

  return result.data;
};
