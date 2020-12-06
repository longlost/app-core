
/**
	*
	*	Common browser api and unpure (side effects) app functionalities.
	*
	**/

import {compose, curry} from './lambda.js';


// *** Use judiciously! ***
//
// ** The more unique uses of this, 
// ** the harder is becomes to trace and debug.
//
// Control document scrolling.
const enableScrolling = (function() {

	const touchMoveHandler = event => event.preventDefault();

	return bool => {

		if (bool) {

			// Enable scrolling.
			document.body.style['overflow-y'] = 'scroll'; 		// Desktop.

			document.removeEventListener( // Mobile.
				'touchmove', 
				touchMoveHandler, 
				{passive: false}
			); 
		} 
		else {

			// Disable scrolling.
			document.body.style['overflow-y'] = 'hidden';  // Desktop.

			document.addEventListener( // Mobile.
				'touchmove', 
				touchMoveHandler, 
				{passive: false}
			); 
		}
	};
}());

// Finds the element that fired the custom event.
// DOM event -> DOM element
const getRootTarget = event => event.composedPath()[0];


const getComputedStyle = (element, property) => {

	if (window.ShadyCSS) {
	  return window.ShadyCSS.getComputedStyleValue(element, property);
	}

	return window.getComputedStyle(element).getPropertyValue(property);	
};

// DOM element -> Boolean
const isDisplayed = element => {
	const display = getComputedStyle(element, 'display');

  return display !== 'none' && display !== '';
};

// Thanks MDN!
// Number, Number -> Number
const randomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min)) + min;
};

// Returns a random element from an array.
// Array -> Any
const randomPluck = array => 
	array[Math.floor(Math.random() * array.length)];

// Randomly shuffle the order of elements in an array.
// Array -> Array
const shuffle = array => {
  const startingIndex = array.length - 1;

  const mapper = (index, arr) => {
    if (index < 0) { return arr; }

    const randomIndex = Math.floor(Math.random() * index);
    const temp = arr[index];

    // Swap random and current elements.
    arr[index] = arr[randomIndex];
    arr[randomIndex] = temp;

    return mapper(index - 1, arr);
  };

  return mapper(startingIndex, [...array]);
};

// 'formatTimestamp' helpers.
const millisToSecs = millis => millis / 1000;
const secsToMins   = secs   => secs   / 60;
const minsToHrs    = mins   => mins   / 60;
const hrsToDays    = hrs    => hrs    / 24;

// 'formatTimestamp' helpers.
const getMins = compose(millisToSecs, secsToMins);
const getHrs  = compose(getMins, minsToHrs);
const getDays = compose(getHrs, hrsToDays);

// 'formatTimestamp' helper.
const formatDate = millis => {
  const date    = new Date(millis);

  const options = {
    weekday: 'short', 
    year:    'numeric', 
    month:   'short', 
    day:     'numeric',
    hour:    'numeric',
    minute:  'numeric'
  };

  return new Intl.DateTimeFormat(undefined, options).format(date);
};

// 'formatTimestamp' helper.
const relativeFormat = (value, unit, style = 'long') => {
  const rtf = new Intl.RelativeTimeFormat(
    undefined, 
    {numeric: 'auto', style}
  );

  return rtf.format(-Math.round(value), unit);
};

// Relative date/time formatting.
// Creates a human readable string from a 
// UTC timestamp in millis (ie. Date.now()).
// 'style' arg is optional. ('long', 'short' or 'narrow').
// Number [, String] -> String
const formatTimestamp = (timestamp, style = 'long') => {
  if (!Intl.RelativeTimeFormat) { return formatDate(timestamp); } 

  const millisSinceNow  = Date.now() - timestamp;
  const oneMinuteMillis = 1000/*millis*/ * 60/*secs*/;

  if (millisSinceNow < oneMinuteMillis) {
    const secs = millisToSecs(millisSinceNow);
    return relativeFormat(secs, 'second', style);
  }

  const oneHourMillis = oneMinuteMillis * 60/*mins*/;

  if (millisSinceNow < oneHourMillis) {
    const mins = getMins(millisSinceNow);
    return relativeFormat(mins, 'minute', style);
  }

  const oneDayMillis = oneHourMillis * 24/*hours*/;

  if (millisSinceNow < oneDayMillis) {
    const hrs = getHrs(millisSinceNow);
    return relativeFormat(hrs, 'hour', style);
  }

  const oneWeekMillis = oneDayMillis * 7/*days*/;

  if (millisSinceNow < oneWeekMillis) {
    const days = getDays(millisSinceNow);
    return relativeFormat(days, 'day', style);
  }

  return formatDate(timestamp);
};

// Pause a functions execution for a number of milliseconds.
// Use async/await or promise style when possible.
// Callback style, while optional, is NOT recommended.
const wait = (waitTime, callback) => {

	return new Promise(resolve => {

		window.setTimeout(() => {

			window.requestAnimationFrame(() => {

				if (!callback) { 
					resolve(); 
					return;
				}

				if (typeof callback === 'function') {
	    		resolve(callback());
	    	}
			});

		}, waitTime);
	});
};

// Syncronize function execution with browser 
// animation cycle to reduce jank.
// Use async/await or promise style when possible.
// Callback style, while optional, is NOT recommended.
const schedule = async callback => {

	return new Promise(resolve => {

		window.requestAnimationFrame(() => {

			window.requestAnimationFrame(() => {

				if (!callback) { resolve(); }

				if (typeof callback === 'function') {
	    		resolve(callback());
	    	}
			});
		});
	});
};

// Stop event from bubbling up.
const consumeEvent = event => {
  event.stopPropagation();
  event.stopImmediatePropagation();

  return event;
};

// Fully take over default browser
// event actions and stop from bubbling.
const hijackEvent = event => {	
	event.preventDefault();	

	return consumeEvent(event);
};

// Promised base event listener wrapper used
// when only a single event trigger is needed.
const listenOnce = (target, name, handler) => {

	const promise = new Promise(resolve => {

		const oneTimeHandler = event => {
			target.removeEventListener(name, oneTimeHandler);

			if (typeof handler === 'function') {
				const value = handler(event);

				resolve({event, value});
			}

			resolve({event});
		};

		target.addEventListener(name, oneTimeHandler);
	});

	return promise;
};


// '__toastQueue' helper.
const __getToast = id => {
	const app 		 = document.querySelector('app-main');
	const appShell = app.shadowRoot.querySelector('app-shell');

	const promise = new Promise(resolve => {

		// May already be connected.
		if (appShell.customElementConnected) {
			resolve(appShell.$[id]);
		} 
		else {

			const handler = event => {
				const node = event.detail.node;

				// Ignore child events.
				if (node.nodeName === 'APP-SHELL') {
					appShell.removeEventListener('custom-element-connected', handler);

					resolve(node.$[id]);
				}
			};

			appShell.addEventListener('custom-element-connected', handler);
		}
	});

	return promise;
};

// '__toastQueue' helper.
function* __queueGen(toast, queue) {

	while(queue.length > 1) {
		toast.show(queue[0]);
		queue.shift();

		yield listenOnce(toast, 'iron-overlay-closed');
	}

	toast.show(queue[0]);

	return listenOnce(toast, 'iron-overlay-closed');
}

// Creates a single, asynchronous
// queue for all app-shell toast elements.
const __toastQueue = id => {
	let 	toast;
	const cachedQueue = [];

	const enqueue = async str => {
		try {
			if (!toast) {
				toast = await __getToast(id);

				if (!toast) { return; }
			}

			cachedQueue.push(str);

			// Start a generator with a snapshot of the cachedQueue
			// so this instance only waits for pending toast events 
			// in line ahead of it.
			const gen = __queueGen(toast, cachedQueue);

			// Async iteration over current queue.
			while (true) {
		    const {done, value} = gen.next();
		    const {event} 			= await value;

		    if (done) {
		    	const index = cachedQueue.indexOf(str);

		    	if (index > -1) {

		    		// Clean up the cache.
		    		cachedQueue.splice(index, 1);
		    	}

		    	return event;
		    }
		  }
		} 
		catch(error) {
			console.warn('__toastQueue enqueue function error', error);
		}
	};

	return enqueue;
};

// File system toast includes two buttons.
const fsToast = __toastQueue('fsToast');

// Message toast is a plain text toast.
const message = __toastQueue('toast');

// Warning toast includes a warning icon.
const warn 		= __toastQueue('warningToast');

// Confirm toast includes an undo button.
const confirm = __toastQueue('confirmToast');

// Service worker toast includes a refresh button.
const swToast = __toastQueue('swToast');

// 'isOnScreen' helper.
// Start observing an element with IntersectionObserver
// set to watch the intersection of the element
// and the viewport.
// Also observe element with MutationObserver
// so that promise is resolved if element 
// is removed from DOM tree.
// DOM element, Number -> Promise -> DOM element
const __getIntersectionPromise = (element, trigger) => () => {	

	const intOptions = {
    root:        null, // null sets root to device viewport.
    rootMargin: `${trigger}px`,
    threshold:   0
  };

  const mutOptions = {
	  childList: true
	};

	return new Promise((resolve, reject) => {
		let intObserver;
		let mutObserver;

		// Resolve promise if element becomes visible on screen.
		const intCallback = entries => {

			// Only a single element being observed.
			const {isIntersecting} = entries[0]; 

			if (isIntersecting) {
				intObserver.unobserve(element); // Cleanup.
				mutObserver.disconnect();

				window.requestAnimationFrame(() => { // Minimize jank.
					resolve(element);
				});
			}
		};

		// Resolve promise if element is removed from DOM tree.
		const mutCallback = mutations => {
			const removed = 
				mutations.some(mutation => 
					Array.from(mutation.removedNodes).includes(element));

   		if (removed) {
   			intObserver.unobserve(element); // Cleanup.
				mutObserver.disconnect();

				window.requestAnimationFrame(() => { // Minimize jank.
					reject('Element removed.');
				});
   		}
		};

		intObserver = new window.IntersectionObserver(intCallback, intOptions);
		mutObserver = new window.MutationObserver(mutCallback);
		intObserver.observe(element);
		mutObserver.observe(element.parentNode, mutOptions);
	});
};

// Excepts a dom element and returns a promise 
// which resolves when element is scrolled into view,
// or an array of dom elements and returns an iterator of promises.
// 'triggerDistance' is how many pixels below the fold to measure
// before resolving the promise (triggerDistance = 0 resolves at the bottom of screen,
// triggerDistance = 128 resolves when element is 128px below the fold).
const isOnScreen = (element, triggerDistance = 128) => {

	if (Array.isArray(element)) { // Return an iterable of promises.
		const array = element;

		function* gen() {
			let index = 0;

			while (true) {

				// iterator.next() -> {done: false, value: <Function> that returns a promise}
				yield __getIntersectionPromise(array[index], triggerDistance);
				index += 1;

				if (index === array.length) {
					return; // iterator.next() -> {done: true, value: undefined};
				}
			}
		} 

		const iterator = gen();
		return iterator;
	}

	return __getIntersectionPromise(element, triggerDistance)();
};
  
// obj -> ie. {small: 1024, medium: 1400, big: 1800} 
// Callback ran with key passed in.
const screenBreakPoints = (obj, callback) => {
  const keys = Object.keys(obj);

  // Sort breakpoints ascending by value.
  // Two seperate arrays in order to handle
  // changes to screen size in both directions.
  const smallArray = 
  	keys.
  		map(key 		=> ({val: obj[key], key})).
  		sort((a, b) => a.val - b.val);

  const bigArray = [...smallArray, 6000]; // 6000 -> bigger than largest theoretical screen size.

  const listsMapper = type => ({val, key}) => 
    ({key, list: window.matchMedia(`(${type}-width: ${val}px)`)});

  const minListsMapper = listsMapper('min');
  const maxListsMapper = listsMapper('max');

  const staggeredSmallArray = smallArray.map((obj, index) => 
    ({...obj, key: bigArray[index + 1].key}));

  const minLists = staggeredSmallArray.map(minListsMapper);
  const maxLists = bigArray.map(maxListsMapper);

  const allLists 	 = [...minLists, ...maxLists]; 
  const firstMatch = maxLists.find(obj => obj.list.matches);  

  if (firstMatch) {
    callback(firstMatch.key);
  }
  else {
    callback('match not found');
  }

  allLists.forEach(obj => {

    obj.list.addListener(mqlEvent => {
      const mql = mqlEvent.currentTarget; // Media query list.

      if (mql.matches) {
        callback(obj.key);
      }
    })
  });
};

// String --> Promise --> Object
// Returns a promise which resolves with an object 
// containing the natural sizes of a given image source string.
const naturals = (src, crossorigin = 'anonymous') => {

  const img = new Image();

  return new Promise((resolve, reject) => {

    img.onload = () => {
      resolve({
        naturalHeight: img.naturalHeight, 
        naturalWidth:  img.naturalWidth
      });
    };

    img.onerror = reject;

    img.crossOrigin = crossorigin;
    img.src = src;
  });
};

// Returns a true JS Object instead of a limited DOMRect.
const getBBox = element => {

	const rect = element.getBoundingClientRect();

	return {
    top: 		rect.top,
    right: 	rect.right,
    bottom: rect.bottom,
    left: 	rect.left,
    width:  rect.width,
    height: rect.height,
    x: 			rect.x,
    y: 			rect.y
  };
};


export {
	confirm,
	consumeEvent,
  enableScrolling,
  formatTimestamp,
  fsToast,
  getBBox,
  getComputedStyle,
  getRootTarget,
  hijackEvent,
  isDisplayed,
  isOnScreen,
  listenOnce,
  message,
  naturals,
  randomInt,
  randomPluck,
  schedule,
  screenBreakPoints,
  shuffle,
  swToast,
  wait,
  warn
};
