'use strict';

const functions   = require('firebase-functions');
const admin       = require('firebase-admin');
const cloudDelete = require('./cloud-delete.js');

// Common app cloud functions.

// Usage in a Firebase project. 
//
// In './functions/index.js'...
//
// const functions = require('firebase-functions');
// const admin     = require('firebase-admin'); // access Auth, Realtime Database and Firestore
// ...
// // Creates grouped functions, ie. 'boot-createUser', 'boot-deleteUser'
// exports.boot = require('@longlost/boot/cloud');



// Add new user info to db.
exports.createUser = functions.auth.user().onCreate(async user => {

  // Fix for email signup where userName is null.
  // 'firebaseui' creates user, then updates user profile info.
  // This may cause a race condition that can fail but seems to work for now.
  const userRecord = await admin.auth().getUser(user.uid);

  const keys = Object.keys(userRecord);

  const userData = keys.reduce((accum, key) => {
    
    const val = userRecord[key];

    // Firestore does not allow undefined values.
    // Null vals are not necessary.
    if (val === undefined || val === null) { 
      return accum;
    }

    // Firestore does not allow functions/methods or custom objects.
    if (typeof val === 'function' || typeof val === 'object') {         
      return accum;
    }

    accum[key] = val;

    return accum;
  }, {});

  userData.createdAt = Date.now();

  // Save the new users data in firestore.
  await admin.firestore().collection('users').doc(user.uid).set(userData);

  return null; 
});


// Remove user info from db when user account is deleted.
exports.deleteUser = functions.
  runWith({
    timeoutSeconds: 540,
    memory:        '2GB'
  }).
  auth.user().onDelete(async user => {
  
    const path = `users/${user.uid}`;

    await cloudDelete.recursiveDelete(path); 

    return null;  
  });


const imageProcessingDone = item => {

  const {optimized, optimizedError, thumbnail, thumbnailError} = item;
  const optimizedDone = Boolean(optimized || optimizedError);
  const thumbnailDone = Boolean(optimized || optimizedError);

  return optimizedDone && thumbnailDone;
};

// Wait for image to finish being processed, then 
// save the updates to the user profile data.
const manageProfilePhoto = (item, type, ref, userId) => {

  if (!item || imageProcessingDone(item)) { return; }

  const {coll, doc, uid} = item;

  return new Promise(async (resolve, reject) => {

    try {

      // Get live updates on the photo item being processed.
      // Subscribe to the db location where photo is being saved.
      const unsubscribe = await admin.firestore().collection(coll).doc(doc).
        onSnapshot(async snap => {

          try {

            // Bail if the item has been deleted before processing is done.
            if (!snap.exists) { 
              unsubscribe();
              resolve();
              return;
            }

            const data = snap.data();

            // Skip partially processed snapshots.
            if (!imageProcessingDone(data)) { return; }

            // Double check the 'users/{userId}' data to make sure
            // that the user hasn't changed the photo again.
            const doubleCheckData = await admin.firestore().collection('users').doc(userId).get();

            // Test 'uid' against the returned 'data[type].uid'.
            // Unsubscribe and resolve the promise if they are not equal.
            if (doubleCheckData[type].uid !== uid) {
              unsubscribe();
              resolve();
              return;
            }

            unsubscribe();

            const {optimized, thumbnail} = data;
            const photoURL = thumbnail || optimized;

            // Update Firestore 'users/{userId}' ref and if 
            // its the 'avatar', update Auth User photoURL field.
            const userPhotoURLPromise = type === 'avatar' ? 
                                          admin.auth().updateUser(userId, {photoURL}) :
                                          Promise.resolve();

            await Promise.all([
              ref.set({[type]: data}, {merge: true}),
              userPhotoURLPromise
            ]);

            resolve();
          }
          catch (error) {

            reject(error);
          }
          
        }, reject);
    }
    catch (error) {

      reject(error);
    }
  });  
};


// Manage user profile photos.
// Waits for image processing to complete then updates user data.
//
// This implementation provides a better user experience since
// the client is not forcing the user to wait while cloud processing
// is taking place.
//
// This also makes for a more reliable mechanism since the client can
// go offline or be refreshed at any time during processing. 
exports.updateProfilePhotos = functions.
  runWith({
    timeoutSeconds: 300, // Match cloud image processing timeout of 5 minutes. (default 60 sec).
  }). 
  firestore.
  document('users/{userId}').
  onUpdate(async (change, context) => {

    try {

      const data = change.after.data();
      const ref  = change.after.ref;

      const {avatar, background} = data;
      const {userId}             = context.params;

      if (!userId) { throw new Error('User ID unavailable.'); }

      // No profile photo changes to manage, so bail.
      if (!avatar && !background) { return null; }

      await Promise.all([
        manageProfilePhoto(avatar,     'avatar',     ref, userId),
        manageProfilePhoto(background, 'background', ref, userId)
      ]);

      return null;

    }
    catch (error) {

      throw error;
    }
  });
