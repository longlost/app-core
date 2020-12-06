

// A simple timer, with start/stop functionality.
//
// If the timer times-out, before being stopped explicitly,
// the timer will run the provided callback.
//
// Calling `stop` clears/resets the timer, preventing the
// provided callback from running.
//
// For use in browser main thread as well as Web Worker context.

import '@ungap/global-this'; /* globalThis */


export default () => {

	let timeoutId;

	const stop = () => {

	  if (timeoutId) {
	    globalThis.clearTimeout(timeoutId);
	    timeoutId = undefined;
	  }
	};

	const start = (duration, callback) => {

	  stop();

	  timeoutId = globalThis.setTimeout(() => {
	  	globalThis.requestAnimationFrame(() => {

		    timeoutId = undefined;

		    if (typeof callback === 'function') {
		    	callback();
		    }
	  	});
	  }, duration);
	};

	return {start, stop};
};
