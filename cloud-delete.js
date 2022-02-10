'use strict';

/**
  * Initiate a recursive delete of a collection, at a given path,
  * along with all subcollections and documents contained with in it.
  * 
  * This delete is NOT an atomic operation and it's possible
  * that it may fail after only deleting some documents.
  * 
  * 
  * 
  * This special function MUST be setup for each individual project.
  * 
  *   https://github.com/firebase/snippets-node/tree/e3cca757ca378a21542f40927715eac67c2b86cf/firestore/solution-deletes
  * 
  * 
  * 
  * Any cloud function utilizing this helper should set 
  * 'runWith' options with these minimum settings.
  * 
  *   .runWith({
  *     timeoutSeconds: 540,
  *     memory: '2GB'
  *   })
  * 
  * 
  * For more details see:
  * 
  *   https://firebase.google.com/docs/firestore/solutions/delete-collections
  * 
  * @param {string} path the document or collection path to delete.
  * 
  **/

const tools     = require('firebase-tools');
const functions = require('firebase-functions');


exports.recursiveDelete = async path => {

  // Run a recursive delete on the given document or collection path.
  // The 'token' must be set in the functions config, and can be generated
  // at the command line by running 'firebase login:ci'.
  await tools.firestore.delete(path, {
    force:     true,
    project:   process.env.GCLOUD_PROJECT,
    recursive: true,
    token:     functions.config().fb.token,
    yes:       true
  });

  return {path};
};
