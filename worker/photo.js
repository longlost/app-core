

// This file is deprecated!! Do NOT use!
//
// For reference in building new modules only.
//
// It is kept incase storing files offline before upload and/or
// processing image palettes with node-vibrant is ever needed in the future.


// must use module resolution in webpack config and include app.config.js file in root
// of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],})
import {appUserAndData} 	 from 'app.config.js';
import {log, privateCache} from './utils.js';
import {storageRef}	 			 from './firebase.js';
import exif 							 from './exif.js';
import * as jimp 					 from 'jimp/browser/lib/jimp.js';
import * as vibrant 			 from 'node-vibrant/lib'; // do not use worker package as it trys to start a new worker
import * as localforage 	 from 'localforage/dist/localforage.min.js';


const {
	imageSize: 						IMAGE_SIZE, 
	imageQuality: 				IMAGE_QUALITY, // output quality of image processing, int 0-100
	photoUploadBatchSize: PHOTO_UPLOAD_BATCH_SIZE // number of photos to simultaneously upload to db
} = appUserAndData;
// must have seperate localforage instance for blobs because
// they will only save properly if they are at the top level
// blobs dont save when nested inside an object
const jobLocalforage  = localforage.createInstance({name: 'Spriteful-Jobs'});
const blobLocalforage = localforage.createInstance({name: 'Spriteful-Blobs'});
// upload state
let currentlyUploading = false;
// cache the job that is currently being processed between 'photoMetadata' and 'processPhoto' funcs
const waiting = privateCache();
// Cache failed jobs with files removed.
// Used for garbage collection purposes.
// Allows promises to be resolved in main thread that are waiting.
// Does not need to be in localforage as a page refresh cleans up these 
// held up promises.
const dreading = privateCache();


const canProcessQueue = () => !currentlyUploading && Self.navigator.onLine;

// use exif.js library to get image orientation
const getOrientation = ({file, extension}) => {
  const promise = new Promise((resolve, reject) => {
  	if (extension === 'jpg' || extension === 'jpeg') {
  		exif.getData(file, () => { 
        const orient = exif.getTag(file, 'Orientation');
        if (orient) {
        	resolve(orient);
        } else {
        	reject('could not get orientation data');
        }
      });
  	} else {
  		resolve(undefined);
  	}
  });

  return promise;
};


const processFile = (file, orientation) => {
	const mime 	 = file.type;
  const width  = (orientation === 6 || orientation === 8) ? jimp.AUTO : IMAGE_SIZE;
  const height = (orientation === 6 || orientation === 8) ? IMAGE_SIZE : jimp.AUTO;
	const reader = new FileReader(); // jimp does not accept raw files
  reader.readAsArrayBuffer(file);

  const promise = new Promise((resolve, reject) => {
  	reader.onload = async () => {
  		if (reader.error) {
  			reject(reader.error);
  		}

  		try {
  			const image = await jimp.read(reader.result);

	  		image.
	  			resize(width, height).
	  			quality(IMAGE_QUALITY).
	  			getBuffer(mime, (err, processedBuffer) => {
						if (err) {
							reject(err);
						}
	  				const blob = new Blob([processedBuffer], {type: mime});
	  				resolve(blob);
					});
	  		} catch(error) { reject(error); }
    };
  });

	return promise;
};


const saveOffline = async (value, blob) => {
	const {key} = value;

	const setJobAndFilePromises = [
	  jobLocalforage.setItem(key,  value), 
	  blobLocalforage.setItem(key, blob)
	];

	await Promise.all(setJobAndFilePromises);
	return blob;
};

// filter out waiting objects that have not been processed yet
const makeJobsArray = obj => Object.keys(obj).
															 	 map(key => obj[key]).
															 	 filter(job => job.hasOwnProperty('blob'));
															 
// helper function to create the image file name from label dynaically
const makeFileNamePrefix = str => str.replace(/\s+|\/+|\"+|\-+|\(+|\)+/g, '').toLowerCase();


const fileUpload = (blob, dir, prefix) => {
  // ie image/jpg --> 'jpg'
  const fileExtension = blob.type.split('/')[1];
  const fileName 			= `${prefix}.${fileExtension}`;
  const uploadTask 		= storageRef.child(`${dir}/${fileName}`).put(blob);


  // TODO:
  // 			add file upload control

  //  // Pause the upload
	// uploadTask.pause();

	// // Resume the upload
	// uploadTask.resume();

	// // Cancel the upload
	// uploadTask.cancel();


  return new Promise((resolve, reject) => {
		// Register three observers:
		// 1. 'state_changed' observer, called any time the state changes
		// 2. Error observer, called on failure
		// 3. Completion observer, called on successful completion
		uploadTask.on('state_changed', snapshot => {
		  // Observe state change events such as progress, pause, and resume
		  // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
		  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
		  log('Upload is ' + progress + '% done');
		  switch (snapshot.state) {
		    case 'paused':
		      log('Upload is paused');
		      break;
		    case 'running':
		      log('Upload is running');
		      break;
		  }
		}, error => {
		  // Handle unsuccessful uploads
		  reject(error);
		}, () => {
		  // Handle successful uploads on complete
		  // For instance, get the download URL: https://firebasestorage.googleapis.com/...
		  const downloadURL = uploadTask.snapshot.downloadURL;
		  resolve({savedName: fileName, savedUrl:  downloadURL});
		});
  });
}; 


// build an array of promises that will run in parallel through Promise.all
const fileUploadPromises = jobs => {
	const uploadPromises = jobs.map(({blob, directory, fileName}) => {
  	// fileName === existingFixture.label ie. '2ft T8/T12'
  	const fileNamePrefix = makeFileNamePrefix(fileName);
    const uploadPromise  = fileUpload(blob, directory, fileNamePrefix);
    return uploadPromise;
  });
  return uploadPromises;
};

// allow gc of file asap
const removeFile = job => {
	delete job.blob;
	delete job.file;
	return job;
};

// assign the newly returned url and name to each job
const addUploadedDataAndRemoveFiles = (jobs, saved) => {
	const savedJob = (job, index) => Object.assign(saved[index], removeFile(job));
	return jobs.map(savedJob);
};


const getBatch = async () => {
  const blobPromises   = [];
  const values         = []; // value === {func, blobName, fileName, key, extension}

  const storeValuesAndMakeBlobPromises = (value, key, iteration) => {
    blobPromises.push(blobLocalforage.getItem(key));
    values.push(value);
    // must return something to escape out of the iterator early
    if (iteration === PHOTO_UPLOAD_BATCH_SIZE) { return blobPromises; }
  };

  const getBlobs  = (promises = blobPromises) => Promise.all(promises);
  
  const makeJobs  = blobs => 
                      blobs.map((blob, index) => 
                        Object.assign({blob}, values[index]));

  const makeBatch = jobs => {
		const batch = jobs.reduce((accumulator, job) => {
      accumulator[job.key] = job;
      return accumulator;
		}, {});

    return batch;
  };

  // iterate over stored jobs
  const promises = await jobLocalforage.iterate(storeValuesAndMakeBlobPromises);
  const blobs 	 = await getBlobs(promises);
  const jobs 		 = makeJobs(blobs);
  const batch 	 = makeBatch(jobs);
  return batch;        
};       


const removeSavedFromQueue = async jobs => {
	const removeItemPromises = jobs.map(job => [
		jobLocalforage.removeItem(job.key),
    blobLocalforage.removeItem(job.key)
	]);
  
  await Promise.all(removeItemPromises);
  const length = await jobLocalforage.length();
  return length;
};



// cache job then return url and orientation
// must get orientation data first because the exif data is destroyed
// by image processing library
const photoMetadata = async job => {
	// job === {extension, file, fileName, func, key}
	const orientation = await getOrientation(job);
	const {file, key} = job;
	const url 				= Self.URL.createObjectURL(file);
	// dont send file back to main thread for better perf
	removeFile(job);
	// waiting to be processed and saved to localforage
	// cache each job for file processing
	waiting.add(job);
	// return key, orientation and url back to photo-capture via web-worker
	return {key, orientation, url};
};


const processPhoto = async job => {
	const {directory, extension,	file,	fileName, key, orientation} = waiting.get(job);
	const blobName = file.name;
	waiting.remove(job);

	const processeBlob = await processFile(file, orientation);
	// newly processed data waiting to be saved to cloud
	const offlineJob = {blobName, directory, extension, fileName, key};
	const savedBlob  = await saveOffline(offlineJob, processeBlob);


	log('processed file size: ', savedBlob.size);


	// send back a new temp url based on compressed image file
	// to maintain a small browser cache
	const url = Self.URL.createObjectURL(savedBlob);
	return {key, orientation: 0, url};
};


const photoUpload = async jobsObj => {
	// job === {func, blob, fileName, key, extension}
	currentlyUploading = true;

	const jobs = makeJobsArray(jobsObj);
	// empty object passed in so there is no work to be done
	if (!jobs.length) { return; }
	
  const uploadPromises = fileUploadPromises(jobs);

  const garbageCollectFiles = uploaded => {
		const uploadedJobs = addUploadedDataAndRemoveFiles(jobs, uploaded);
    return uploadedJobs;
	};

	const completeSuccessfulSaves = async uploadedJobs => {
		const dreadingList = dreading.getAll();

		const completedJobs = uploadedJobs.map(job => {
			const jobIsOnDreadingList = (dreadingList[job.key]);

			if (jobIsOnDreadingList) {
				job.func = 'resolved';
				dreading.remove(resolvedJob);
			} else {
				job.func = 'photoUpload';
			}
			// send entire job as output because it is used to properly
			// save the photo data along with its corresponding app data model
			return job;
		});

		currentlyUploading = false;
		// done uploading so remove successful jobs from localforage queue
		// and return the new queue length
		const queueLength = await removeSavedFromQueue(uploadedJobs);
		return {completedJobs, queueLength};
	};

  const handleErrors = error => {
  	currentlyUploading 		 = false;
		const jobsWithoutFiles = jobs.map(removeFile);

		const raiseExeptionAndRetry = reason => {
		  // add failed attempts to dreading list
			const errors = jobsWithoutFiles.map(job => {
				job.func = 'photoUpload';
				dreading.add(failedJob);
				return {failedJob: job, reason};
			});
			return errors;
		};

		const raiseExeptionAndFail = reason => {
			const errors = jobsWithoutFiles.map(job => ({failedJob: job, reason})); 
	  	return errors;     	
		};
  	// A full list of error codes is available at
	  // https://firebase.google.com/docs/storage/web/handle-errors
	  switch (error.code) {
	    case 'storage/unauthorized':
	      // User doesn't have permission to access the object
	      return raiseExeptionAndRetry('unauthorized');
	    case 'storage/unauthenticated':
	    	return raiseExeptionAndRetry('unauthenticated');
	    case 'storage/retry_limit_exceeded':
	    	return raiseExeptionAndRetry('retry_limit_exceeded');
	    case 'storage/invalid_checksum':
	    	return raiseExeptionAndRetry('invalid_checksum');
	    case 'storage/cannot_slice_blob':
	    	return raiseExeptionAndRetry('cannot_slice_blob');
	    case 'storage/server_wrong_file_size':
	    	return raiseExeptionAndRetry('server_wrong_file_size');
	    case 'storage/canceled':
	      // User canceled the upload
	      return raiseExeptionAndFail('canceled');
	    case 'storage/unknown':
	      // Unknown error occurred, inspect error.serverResponse
	      return raiseExeptionAndFail('unknown');
	    default:
	    	return raiseExeptionAndFail('unknown');
	  }
  };

  try {
	  const uploaded 		 = await Promise.all(uploadPromises);
	  const uploadedJobs = garbageCollectFiles(uploaded);
	  const output  		 = await completeSuccessfulSaves(uploadedJobs);
	  return output;
  }
  catch(error) { return handleErrors(error); }
};


const processQueue = async () => {
	if (canProcessQueue()) {
		const batch  = await getBatch();
		const output = await photoUpload(batch);
		return output;
	}
};


const getUrl = async job => {
	// job === {func: 'getUrl', key, fileKey}
	const blob = await blobLocalforage.getItem(job.fileKey);
  const url  = blob ? Self.URL.createObjectURL(blob) : undefined;
  return url;
};


const revokeUrl = job => {
	Self.URL.revokeObjectURL(job.url);
};


const clearPhotos = async () => {
	waiting.clear();
	dreading.clear();
	await jobLocalforage.clear();
  return blobLocalforage.clear();
};


const deletePhoto = job => {
	waiting.remove(job);
	dreading.remove(job);
	jobLocalforage.removeItem(job.key);
  blobLocalforage.removeItem(job.key);
};


const getPalette = async src => {
	const palette = await vibrant.
										from(src).
										getPalette();
	const keys = Object.keys(palette).filter(key => palette[key]);
  const fullPalette = keys.reduce((accum, key) => {
    accum[key] = {
    	hex: 	 palette[key].getHex(),
      rgb:   palette[key].getRgb(),
      title: palette[key].getTitleTextColor(),
      body:  palette[key].getBodyTextColor()
    };
    return accum;
  }, {});						
  return fullPalette;
};


export {
	clearPhotos,
	deletePhoto,
	getPalette,
	getUrl,
	photoUpload,
	photoMetadata,
	processPhoto,
	processQueue,
	revokeUrl
};
