
/**
	*
	*		This modules aggregates the Firebase SDK middleware modules.
	*
	*		The "Services" module is an abstraction layer to the underlying
	* 	database, file storage and cloud function API's.
	* 
	* 	
	* 	Exported middleware functions:
	*
	* 		add,
	* 		cloudFunction,
	* 		deleteBatch,
	* 		deleteDocument,
	* 		deleteField,
	* 		deleteFile,
	* 		enablePersistence,
	* 		fileUpload,
	* 		get,
	* 		getAll,
	* 		getDownloadUrl,
	* 		getMetadata,
	* 		initDb,
	* 		initStorage,
	* 		query,
	* 		querySubscribe,
	* 		set,
	* 		setBatch,
	* 		subscribe,
	* 		textStartsWithSearch,
	* 		updateMetadata
	* 
	*
	* 	
	* 	Exported firebase functions:
	* 
	* 		collection, 
  *			doc, 
  * 		endAt,
  *			getDoc, 
  *			limit, 
  *			onSnapshot, 
  *			orderBy, 
  *			queryColl, 
  *			startAfter, 
  *			startAt,
  *			where
	* 
	*
	*
	* 	Example use:
	*
	*
	*			import {get} from '@longlost/app-shell/services/services.js';
	*	
	*	
	*			const getUserData = async () => {
	* 
	*		  	try {
	*	 
	*			  	const data = await get({coll: 'users', doc: 'clay'});
	*	 
	*			  	console.log('user data: ', data);
	*	 
	*	 				return data;
	*				}
	*				catch (error) { 
	* 				console.error('getUserData error: ', error); 
	* 			}
	*			};
	*	
	*	  	const someUsersData = await getUserData();
	*
	**/


export * from './db.js';

export {default as cloudFunction} from './functions.js';

export * from './storage.js';
