
import {app} from '../boot/boot.js';
import 'firebase/storage';


const storage 	 = app.storage();
const	storageRef = storage.ref();

// Returns a promise.
const deleteFile = path => storageRef.child(path).delete();


const fileUpload = ({
	controlsCallback,
	doneCallback,
	errorCallback, 
	file,
	metadata,
	path,
	stateChangedCallback
}) => {

  const uploadTask = storageRef.child(path).put(file, metadata);

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

	  // Observe state change events such as progress, pause, and resume
	  // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
	  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

	  stateChangedCallback({progress, state: snapshot.state});
	}, error => {
		if (errorCallback) {

		  // Handle unsuccessful uploads
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


const getDownloadUrl = path => storageRef.child(path).getDownloadURL();


const getMetadata = path => storageRef.child(path).getMetadata();


const updateMetadata = (path, metadata) => storageRef.child(path).updateMetadata(metadata);


export {
	deleteFile,
	fileUpload,
	getDownloadUrl,
	getMetadata,
	updateMetadata
};
