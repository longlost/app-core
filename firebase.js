

// This module is intended as a way to keep the firebase dependency 
// isolated to this one repo, to make it easier to maintain. 
//
// Otherwise there can be different versions of firebase, and it 
// becomes a resolution nightmare.


let readyResolver;

const ready = new Promise(resolve => {
  readyResolver = resolve;
});


// This function allows for tree-shaking plus runtime loading to 
// reduce startup costs and is provided to 'app-shell/auth/auth.js'.
const loadAuth = async () => {

  const {
    EmailAuthProvider,
    FacebookAuthProvider,
    GithubAuthProvider,
    GoogleAuthProvider,
    TwitterAuthProvider,
    browserLocalPersistence,
    browserSessionPersistence,
    deleteUser,
    initializeAuth,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithCredential,
    signOut,
    updateEmail,
    updatePassword,
    updateProfile,
    useDeviceLanguage
  } = await import(/* webpackChunkName: 'firebase/auth' */ 'firebase/auth');

  return {
    EmailAuthProvider,
    FacebookAuthProvider,
    GithubAuthProvider,
    GoogleAuthProvider,
    TwitterAuthProvider,
    browserLocalPersistence,
    browserSessionPersistence,
    deleteUser,
    initializeAuth,
    onAuthStateChanged,
    sendEmailVerification,
    signInWithCredential,
    signOut,
    updateEmail,
    updatePassword,
    updateProfile,
    useDeviceLanguage
  };
};


const loadFb = async () => {

  // Must use module resolution in webpack config and include config.js file in root
  // of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],}).
  const {firebaseConfig} = await import(/* webpackChunkName: 'config' */               'config.js');
  const {initializeApp}  = await import(/* webpackChunkName: 'firebase/app' */         'firebase/app');  
  const {getPerformance} = await import(/* webpackChunkName: 'firebase/performance' */ 'firebase/performance');
  const {getAnalytics}   = await import(/* webpackChunkName: 'firebase/analytics' */   'firebase/analytics');

  const firebaseApp = initializeApp(firebaseConfig);

  // Initialize Firebase Analytics and Performance Monitoring.
  const performance = getPerformance(firebaseApp);
  const analytics   = getAnalytics(firebaseApp);

  readyResolver({
    analytics,
    firebaseApp,
    loadAuth,
    performance
  });
};


const app = document.querySelector('#app');
  
if (app.loaded) {
  loadFb();
}
else {

  // Defer loading Firebase assets since they are very large
  // and negatively impact loading performance.
  const loadedHandler = () => {

    app.removeEventListener('app-loaded-changed', loadedHandler);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {

        loadFb();

      });
    });  
  };

  app.addEventListener('app-loaded-changed', loadedHandler);
}


export default () => ready;
