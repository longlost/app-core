
// A promise based Web Animation helper library.

import {curry, flatMap, tail} 	 from './lambda.js';
import {getRootTarget, schedule} from './utils.js';


const ANIMATIONS = {
	'fade-in': [
		{opacity: 0},
		{opacity: 1} 
	],
	'fade-out': [
		{opacity: 1},
		{opacity: 0}
	],
	'scale-down': [
		{transform: 'scale(1)'},
    {transform: 'scale(0)'}
	],
	'scale-up': [
		{transform: 'scale(0)'},
    {transform: 'scale(1)'}
	],
	'slide-from-top': [
		{transform: 'translateY(-100%)'},
    {transform: 'translateY(0)'}
	],
	'slide-from-bottom': [
		{transform: 'translateY(100vh)'},
    {transform: 'translateY(0px)'}
	],
	'slide-from-left': [
		{transform: 'translateX(-100%)'},
    {transform: 'translateX(0)'}
	],
	'slide-from-right': [
		{transform: 'translateX(100%)'},
    {transform: 'translateX(0)'}
	],
	'slide-up': [
		{transform: 'translateY(0)'},
    {transform: 'translateY(-100%)'}
	],
	'slide-down': [
		{transform: 'translateY(0)'},
    {transform: 'translateY(100%)'}
	],
	'slide-left': [
		{transform: 'translateX(0)'},
    {transform: 'translateX(-100%)'}
	],
	'slide-right': [
		{transform: 'translateX(0)'},
    {transform: 'translateX(100%)'}
	]
};


const __getCustomKeyFrames = (name, transformFrom, transformTo) => {

	if (name === 'transform') { 

		if (!transformTo) { 
			return new Error('You must include at least a transformTo string to the custom transform animation.');
		}

		if (transformFrom) { 
			return [{transform: transformFrom}, {transform: transformTo}]; 
		}

		return [{transform: 'none'}, {transfrom: transformTo}];
	}

	return ANIMATIONS[name];
};


/**
	*	Thanks to Jake Archibald for this universal web animation helper.
	*
	* 	This helper normalizes the animate function in such a way
	* 	that results in behavior that is natural and intuitive.
	*
	*		Elements remain in the animations final state instead of
	* 	being reset to their initial state which is the default
	* 	behavior of the element.animate function. The dev no longer
	*		has to worry about keeping track of the state of element styles.
	*
	* 	The outcome is predictable and easy to use animations.
	*
	* @param {HTMLElement} element
	* @param {Keyframe[] | PropertyIndexedKeyframes} to
	* @param {KeyframeAnimationOptions} options
	*
	**/
const animateTo = (element, keyframes, options) => {

	// 'fill': 'both' set to hold animation keyframe 
	// styles before and after animation delays.
	const animation = element.animate(
		keyframes,
		{...options, fill: 'both'}
	);

	// Set styles that correspond to the ending of the animation
	// so that the element state is not reset to that of the 
	// beginning of the animation sequence.
	animation.addEventListener('finish', () => {
		animation.commitStyles();
		animation.cancel();
	});

	return animation;
};


const playAnimation = (element, keyframes, opts = {}) => {

	const defaultOptions = {
		direction: 'normal',
		duration: 	500,
		iterations: 1,
		easing: 	 'linear',
		delay: 			0	
	};

	const options = {...defaultOptions, ...opts};

	// Automatically starts animation.
	// 'fill': 'both' set to hold animation keyframe 
	// styles before and after animation delays.
	const animation = element.animate(
		keyframes,
		{...options, fill: 'both'}
	);

	const promise = new Promise((resolve, reject) => {

		// Set styles that correspond to the ending of the animation
		// so that the element state is not reset to that of the 
		// beginning of the animation sequence.
		animation.addEventListener('finish', event => {
			animation.commitStyles();
			animation.cancel();

			resolve(event);
		});

		animation.addEventListener('cancel', event => {
			window.requestAnimationFrame(() => {
				reject(event);
			});
		});
		
	});

	// 'animation' props: {cancel, currentTime, finish, id, pause, play, playState, playbackRate, reverse, startTime}
	return {animation, promise};
};


// Returns an array of promises.
const __setupAnimations = ({name, nodes, options, transformFrom, transformTo}) => {
	const keyframes = __getCustomKeyFrames(name, transformFrom, transformTo);

	if (!keyframes) { throw new Error(`${name} custom animation not found`); }

	const playPromise = node => playAnimation(node, keyframes, options).promise;

	if (Array.isArray(nodes)) {
		const promises = nodes.map(playPromise);

		return promises;
	}

	return [playPromise(nodes)];
};


// Accepts object or array of objects.
// Returns promises which resolve when the animation finishes.
//
// animation object === {
//   name: 					animation type, 
// 	 nodes: 				dom node or [dom nodes], 
// 	 options: 			{delay: ms, direction: str, duration: ms, easing: str, iterations: int or str,}
// 	 transformFrom: custom transform string for 'transform' animation name
// 	 transformTo: 	custom transform string for 'transform' animation name
// }
//
// Collection can be an animation object or an array of animation objects.


// TODO:
// 			update to include cascaded and ripple animations

const customAnimation = collection => {
	if (!collection) { return new Error('animation needs more data'); }

	if (typeof collection !== 'object') {
		return new TypeError('animation parameter must be an object or array of objects');
	}

	if (Array.isArray(collection)) {
		const setupPromises2D = flatMap(__setupAnimations);
		const flatPromises 		= setupPromises2D(collection);

		return Promise.all(flatPromises);
	} 
	else if (typeof collection === 'object') {
		const promises = __setupAnimations(collection);

		return Promise.all(promises);
	}
};


// Thanks to Paul Lewis (@aerotwist) for this handy way to 
// create dynamic grow/shrink animations.
//
// FLIP stands for First, Last, Invert, Play.
// see https://aerotwist.com/blog/flip-your-animations/
const flip = async ({
	css, 
	element, 
	reverse, 
	transition = 'transform 0.4s cubic-bezier(0.49, 0.01, 0, 1)', 
	transitionClass
}) => {

	// First.
	// Measure initial position.
  const first = element.getBoundingClientRect();
  
  const calcInversion = () => {

  	// Set last position class.
    if (reverse) {
      element.classList.remove(css);
    } 
    else {
      element.classList.add(css);
    }

    // Last.
    // Measure final position.
    const last = element.getBoundingClientRect();

    // Calculate inverted translate and scale.
    return {
      x:  first.left - last.left,
      y:  first.top  - last.top,
      sx: last.width  > 0 ? first.width  / last.width  : first.width,
      sy: last.height > 0 ? first.height / last.height : first.height
    };
  };

  // Invert.
  const {x, y, sx, sy} = calcInversion();

  // Apply a transform that resets the element back to its orginal
  // position, so that when the transform is removed, the element 
  // transitions into its final state.
  element.style['transform-origin'] = '0 0';
  element.style['transform'] = `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;

  await schedule();

  const transitionPromise = () => {

  	let resolver;

  	// Wrap up and remove listeners.                                                  
	  const finish = event => {

	  	if (getRootTarget(event) === element && event.propertyName === 'transform') {

	      if (transitionClass) {
	      	element.classList.remove(transitionClass);
	      }
	      else {
	      	element.style['transition'] = 'none';
	      }

	      element.removeEventListener('transitionend', 		finish);
	      element.removeEventListener('transitioncancel', finish);

	      resolver(event);		
	  	} 
		};
		  
		element.addEventListener('transitionend',  	 finish);
		element.addEventListener('transitioncancel', finish);

  	return new Promise(resolve => {
  		resolver = resolve;		  
	  });
  };


  if (transitionClass) {
  	element.classList.add(transitionClass);
  }
  else {
  	element.style['transition'] = transition;
  }

  // Play.
  element.style['transform'] = '';

  return transitionPromise();
};


// JS easing function from Paul Lewis (@aerotwist).
// 'power' === 1 is a linear ease.
// 'value' is between 0 and 1 (start and finish).
const ease = curry((power, value) => 1 - ((1 - value) ** power));


export {

	// Returns the animation obj. 
	// Runs synchronously, starts animation but does not wait to 'finish'.
	animateTo, 
	customAnimation,
	ease,
	flip,

	// Starts the aniation.
	// Returns an object that includes a 'promise' and the 'animation' object.
	// The 'promise' resolves on 'finish' and rejects on 'cancel'.
  playAnimation 
};
