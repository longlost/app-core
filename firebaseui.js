
// These imports moved here to make dependency maintenance easier.

// Importing here allows 'polymer-css-loader' to pick it up,
// which exposes it to be included in the consuming modules' dom styles.
//    ie. <style include="firebaseui">
import 'firebaseui/dist/firebaseui.css';

export * from 'firebaseui';
