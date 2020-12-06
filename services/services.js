
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


let functions;
let storage;


const checkFunctions = async () => {
	if (functions) { return; }

	const {default: fns} = 
		await import(/* webpackChunkName: 'functions' */ './functions.js');

	functions = fns;
};


const checkStorage = async () => {
	if (storage) { return; }

	storage = await import(/* webpackChunkName: 'storage' */ './storage.js');
};


const cloudFunction = async (...args) => {
	await checkFunctions();
	return functions(...args);
};


const deleteFile = async (...args) => {
	await checkStorage();
	return storage.deleteFile(...args);
};


const fileUpload = async (...args) => {
	await checkStorage();
	return storage.fileUpload(...args);
};


const getDownloadUrl = async (...args) => {
	await checkStorage();
	return storage.getDownloadUrl(...args);
};


const getMetadata = async (...args) => {
	await checkStorage();
	return storage.getMetadata(...args);
};


const updateMetadata = async (...args) => {
	await checkStorage();
	return storage.updateMetadata(...args);
};


// Promises.
const services = {
	add,
	cloudFunction,
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
