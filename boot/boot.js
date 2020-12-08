
// Pulls in roboto fonts and resolves 
// a fouc with lazy loaded <paper-input>'s.
import '@polymer/paper-styles/typography.js';

// Register a service worker.
// Note: Don't name this file 'window-service-worker.js',
// webpack does NOT like that name, ignores the file.
import './sw.js';

// Conditionally load polyfills.
import './polyfills.js';

// Must use module resolution in webpack config and include config.js file in root
// of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],}).
import {firebaseConfig} from 'config.js';
import firebase 				from 'firebase/app';

// must fix 'IDBIndex undefined' error that causes
// googlebot to not render on search console before 
// including performance monitoring
// adding the indexeddbshim for the legacy build 
// in webpack does not solve this issue
// import 'firebase/performance';

    
const app = firebase.initializeApp(firebaseConfig);


// // initialize Performance Monitoring
// const performance = app.performance();



// Create a '<custom-styel></custom-style>' in document head 
// to persist ShadyCSS @apply mixins until browsers support shadow parts spec.
// Cannot have both the '<custom-style>' tag and inject a manifest.json via webpack
// so must use js to insert it.
const customStyleTag = document.querySelector('#custom-style');

if (customStyleTag) {
	window.ShadyCSS.CustomStyleInterface.
		addCustomStyle(customStyleTag);
}

// Disable scroll position caching by browser through refreshes.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// This function is provided to 'app-shell/auth/auth.js' as a way
// to keep the firebase dependency isolated to this one repo,
// to make it easier to maintain. Otherwise there can be different 
// versions and it becomes a resolution nightmare.
const loadFirebaseAuth = () => import(
	/* webpackChunkName: 'firebase/auth' */ 
	'firebase/auth'
);


// export {app, firebase, performance};
export {app, firebase, loadFirebaseAuth};
