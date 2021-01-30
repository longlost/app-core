
/**
  *   Cloud functions callable functions interface.
  * 
  *
  **/


import firebaseReady from '../firebase.js';


let functions;

const init = async () => {

  const {firebase} = await firebaseReady();

  await import(/* webpackChunkName: 'firebase/functions' */ 'firebase/functions');

  functions = firebase.functions();
};

// No try catch, forward error out to main thread,
// so developer can take steps to properly handle them.
export default async job => {

  if (!functions) {
    await init();
  }

  const {name, data = {}} = job;
  const callable          = functions.httpsCallable(name);

  const result = await callable(data);

  return result.data;
};
