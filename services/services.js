
/**
	*
	*		Middleware wrapper around Firebase Web platform that lazy-loads 
	* 	Firebase Cloud Functions and Storage.
	*
	*		The reason for this is to defer loading large assets
	* 	that are not required for boot up as well as to have a single
	* 	update point should the Firebase Api change over time.
	*
	*
	* 	example use:
	*
	*
	*		import services from '@longlost/app-shell/services/services.js';
	*
	*
	*		const getUserData = async () => {
	*	  	try {
	*		  	const data = await services.get({coll: 'users', doc: 'some uid string goes here'});
	*		  	console.log('user data: ', data);
	* 				return data;
	*			}
	*			catch (error) { console.error('getUserData error: ', error); }
	*		};
	*
	*  	const someUsersData = await getUserData();
	*
	**/


import {
	add,
	deleteDocument,
	deleteField,
	deleteItems,
	enablePersistence,
	get,
	getAll,
	query,
	querySubscribe,
	saveItems,
	set,
	subscribe,
	textStartsWithSearch
} from './db.js';

import functions from './functions.js';

import {
	deleteFile,
	fileUpload,
	getDownloadUrl,
	getMetadata,
	updateMetadata
} from './storage.js';


// Promises.
const services = {
	add,
	cloudFunction: functions,
	deleteDocument,
	deleteField,
	deleteFile,
	deleteItems,
	enablePersistence,
	fileUpload,
	get,
	getAll,
	getDownloadUrl,
	getMetadata,
	query,
	querySubscribe,
	saveItems,
	set,
	subscribe,
	textStartsWithSearch,
	updateMetadata
};


export default services;
