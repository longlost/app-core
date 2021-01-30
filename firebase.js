

// This function is provided to 'app-shell/auth/auth.js' as a way
// to keep the firebase dependency isolated to this one repo,
// to make it easier to maintain. Otherwise there can be different 
// versions of firebase and it becomes a resolution nightmare.
const loadAuth = () => import(
  /* webpackChunkName: 'firebase/auth' */ 
  'firebase/auth'
);


let readyResolver;

const ready = new Promise(resolve => {
  readyResolver = resolve;
});


const loadFb = async () => {
  // Must use module resolution in webpack config and include config.js file in root
  // of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],}).
  const {firebaseConfig}    = await import(/* webpackChunkName: 'firebaseConfig' */ 'config.js');
  const {default: firebase} = await import(/* webpackChunkName: 'firebase/app' */ 'firebase/app');

  firebase.initializeApp(firebaseConfig);

  // Must fix 'IDBIndex undefined' error that causes
  // googlebot to not render on search console before 
  // including performance monitoring.
  // Adding the indexeddbshim for the legacy build 
  // in webpack does NOT solve this issue.
  await Promise.all([
    import(/* webpackChunkName: 'firebase/performance' */ 'firebase/performance'),
    import(/* webpackChunkName: 'firebase/analytics' */   'firebase/analytics')
  ]);

  // Initialize Firebase Analytics and Performance Monitoring.
  const performance = firebase.performance();
  const analytics   = firebase.analytics();

  readyResolver({
    analytics,
    firebase,
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
