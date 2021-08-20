

import {
	deleteObject,
	getDownloadURL as getURL,
	getMetadata as getMeta,
	getStorage,
	ref,
	updateMetadata as updateMeta,
	uploadBytesResumable
} from 'firebase/storage';

import firebaseReady from '../firebase.js';


let fbStorage;


const init = async () => {

	if (fbStorage) { return fbStorage; }

	const {firebaseApp} = await firebaseReady();
	fbStorage 						= getStorage(firebaseApp);

	return fbStorage;
};


const deleteFile = async path => {

	const storage = await init();

	return deleteObject(ref(storage, path));
};


const fileUpload = async ({
	controlsCallback,
	doneCallback,
	errorCallback, 
	file,
	metadata,
	path,
	stateChangedCallback
}) => {

	const storage 	 = await init();
	const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storage, file, metadata);

  if (controlsCallback) {
  	const {cancel, pause, resume} = uploadTask;

	  const controls = {
	  	cancel: cancel.bind(uploadTask),
	  	pause:  pause.bind(uploadTask),
	  	resume: resume.bind(uploadTask)
	  };

  	controlsCallback(controls);
  }

	uploadTask.on('state_changed', snapshot => {

		if (!stateChangedCallback) { return; }

	  // Observe state change events such as progress, pause, and resume.
	  //
	  // Get task progress, including the number of bytes uploaded and 
	  // the total number of bytes to be uploaded.
	  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

	  stateChangedCallback({progress, state: snapshot.state});

	}, error => {

		if (errorCallback) {

		  // Handle unsuccessful uploads.
		  errorCallback(error);
		}
		else {
			throw error;
		}

	}, async () => {

	  // Handle successful uploads on complete.
	  // For instance, get the download URL: https://firebasestorage.googleapis.com/...
	  const url = await getURL(uploadTask.snapshot.ref);

	  doneCallback({url, path});
	});
};


const getDownloadUrl = async path => {

	const storage = await init();

	return getURL(ref(storage, path));
};


const getMetadata = async path => {

	const storage = await init();

	return getMeta(ref(storage, path));
};


const updateMetadata = async (path, metadata) => {

	const storage = await init();

	return updateMeta(ref(storage, path), metadata);
};


export {
	deleteFile,
	fileUpload,
	getDownloadUrl,
	getMetadata,
	updateMetadata
};
