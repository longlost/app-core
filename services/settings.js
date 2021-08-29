
// For use by db.js only.
let shouldEnableDbPersistence = false;


export const getEnablePersistence = () => shouldEnableDbPersistence;

// Calling this function will trigger the db to have offline
// persistence setup on the next db invocation.
//
// This allows the app to set this at anytime without incurring
// the network and runtime price of importing the db modules.
// 
// The intention is to improve startup/first load performance.
export const setEnableDbPersistence = () => {
  shouldEnableDbPersistence = true;
};
