
// Polymer globals. 
// These settings are recommended to improve performance.
import {
  setPassiveTouchGestures, 
  setRemoveNestedTemplates
} from '@polymer/polymer/lib/utils/settings.js';

// Pulls in roboto fonts and resolves 
// a fouc with lazy loaded <paper-input>'s.
import '@polymer/paper-styles/typography.js';

// Register a service worker.
//
// NOTE: 
//      Do NOT name this file 'window-service-worker.js'.
//      Webpack does NOT like that name, ignores the file.
import './sw.js';

// Conditionally load polyfills.
import './polyfills.js';


setPassiveTouchGestures(true);
setRemoveNestedTemplates(true);

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

// Load a custom version of the Roboto stylesheet which includes
// the CSS @font 'display: swap;' definition, as per Lighthouse
// suggestion for improved loading performance.
window.addEventListener('load', () => {

  const link = document.createElement('link');

  link.rel         = 'stylesheet';
  link.type        = 'text/css';
  link.crossOrigin = 'anonymous';
  link.href        =
    'https://fonts.googleapis.com/css?family=Roboto+Mono:400,700|Roboto:400,300,300italic,400italic,500,500italic,700,700italic&display=swap';
  
  document.head.appendChild(link);
});
