
/**
	*		Cloud functions callable functions interface.
	*	
	*
	**/


import {firebase} from '../boot/boot.js';
import 'firebase/functions';


const functions = firebase.functions();

// No try catch, forward error out to main thread,
// so consumer can take steps to properly handle them.
export default async job => {

	const {name, data = {}} = job;
	const callable = functions.httpsCallable(name);

	const result = await callable(data);

	return result.data;
};
