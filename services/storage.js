
import firebaseReady from '../firebase.js';


let storageRef;

const init = async () => {

	if (storageRef) { return storageRef; }

	const {firebase} = await firebaseReady();

	await import(/* webpackChunkName: 'firebase/storage' */ 'firebase/storage');

	const storage = firebase.storage();

	storageRef = storage.ref();

	return storageRef;
};


const deleteFile = async path => {

	const ref = await init();

	return ref.child(path).delete();
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

	const ref = await init();

  const uploadTask = ref.child(path).put(file, metadata);

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
	  const url = await uploadTask.snapshot.ref.getDownloadURL();

	  doneCallback({url, path});
	});
};


const getDownloadUrl = async path => {

	const ref = await init();

	return ref.child(path).getDownloadURL();
};


const getMetadata = async path => {

	const ref = await init();

	return ref.child(path).getMetadata();
};


const updateMetadata = async (path, metadata) => {

	const ref = await init();

	return ref.child(path).updateMetadata(metadata);
};


export {
	deleteFile,
	fileUpload,
	getDownloadUrl,
	getMetadata,
	updateMetadata
};
