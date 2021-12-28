

import {getEnablePersistence} from './settings.js';

import {
  addDoc,
  clearIndexedDbPersistence,
  collection,
  deleteDoc,
  deleteField as deleteDocField,
  doc,
  enableMultiTabIndexedDbPersistence,
  endAt,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query as queryColl,
  setDoc,
  startAfter,
  startAt,
  terminate,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';

import firebaseReady from '../firebase.js';


export {
  collection, 
  doc, 
  getDoc, 
  limit, 
  onSnapshot, 
  orderBy, 
  queryColl, 
  startAfter, 
  startAt,
  where
};


// Offline, multi-tab persistence.
//
// See app-settings via app-shell.
//
// The state is held in local-storage in app-shell and
// can be changed by user in settings.
//
// Each device can have its own state
// in case user uses app on a shared device.
let persistenceEnabled = false;


const enablePersistence = async db => {

  try {

    if (!persistenceEnabled && getEnablePersistence()) {

      await enableMultiTabIndexedDbPersistence(db, {synchronizeTabs: true});

      persistenceEnabled = true;
    }

  }
  catch (error) {

    if (error.code === 'failed-precondition') {

        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        console.warn('firestore persistence failed-precondition');
    } 
    else if (error.code === 'unimplemented') {

        // The current browser does not support all of the
        // features required to enable persistence.
        console.warn('firestore persistence unimplemented');
    } 
    else {
      throw error;
    }
  }
};


let firestore;


export const initDb = async () => {

  if (!firestore) { 

    const {firebaseApp}  = await firebaseReady();
    const {getFirestore} = await import(
      /* webpackChunkName: 'firebase/firestore' */ 
      'firebase/firestore'
    );

    firestore = getFirestore(firebaseApp);
  }
  
  await enablePersistence(firestore);

  return firestore;
};


export const shutdownDb = async () => {

  if (!firestore) { return; }

  // Shutdown and remove cached user data from device.
  await terminate(firestore);
  return clearIndexedDbPersistence(firestore);
};


const addOrderBy = jobOrderBy => {

  if (jobOrderBy && (jobOrderBy.name || jobOrderBy.prop)) {

    const {direction = 'asc', name, prop} = jobOrderBy;
    const by = name ? name : prop;

    return orderBy(by, direction);
  }
};

// 'orderBy' --> {name or prop, direction}
const buildCompoundParams = job => {
  
  const orderByParam = addOrderBy(job.orderBy);
  const params       = [];

  if (orderByParam) {
    params.push(orderByParam);
  }

  if (job.startAt) {
    params.push(startAt(job.startAt));
  }

  if (job.endAt) {
    params.push(endAt(job.endAt));
  }

  if (job.limit) {
    params.push(limit(job.limit));
  }
  
  return params;
};


const buildCompoundConstraints = job => {

  if (Array.isArray(job.constraints)) {

    const constraints = job.constraints.reduce((accum, input) => {

      const {comparator, field, operator} = input;

      accum.push(where(field, operator, comparator));

      // 'orderBy' --> {name or prop, direction}
      // 'addOrderBy' may return undefined.
      const orderByParam = addOrderBy(input.orderBy);

      if (orderByParam) {
        accum.push(orderByParam);
      }

      return accum;
    }, []);

    return constraints;
  }

  const {comparator, field, operator} = job.constraints;

  const constraints  = [where(field, operator, comparator)];
  const orderByParam = addOrderBy(job.constraints.orderBy);

  if (orderByParam) {
    constraints.push(orderByParam);
  }

  return constraints;
};

// 'subscribe' and 'querySubscribe' helper.
//
// Calls callback with document data.
//
// Returns a function that unsubscribes.
const startSubscription = (q, cb, onError) => {

  return onSnapshot(q, snapshot => {

    if (snapshot.exists || ('empty' in snapshot && snapshot.empty === false)) {

      if (snapshot.docs) {
        const data = [];

        snapshot.forEach(doc => data.push(doc.data()));

        cb(data);
      } 
      else {
        const data = snapshot.data();

        cb(data);
      }
    } 
    else {
      onError({message: 'document does not exist'});
    }

  }, onError);
};

// @@@@@ add data @@@@
//
// Use a flattened data structure similar to realtime-database.
//
// Limit subcollections and nested data when possible.
// This has the tradoff of being harder to grok but better performance
// as the database grows.
//
// Note: no multi-dimentional arrays can be stored.
//
// Input shape: {coll, data}
export const add = async job => {

  const db = await initDb();

  return addDoc(collection(db, job.coll), job.data);
};

// Must include 'coll', 'doc' and 'data'.
// Input shape: {coll, doc, data, merge}
export const set = async job => {

  const db    = await initDb();
  const merge = job.merge ?? true;

  // 'set' with merge true create a document if one does not already exist
  // and will only overwrite specified fields that are passed in.
  return setDoc(doc(db, job.coll, job.doc), job.data, {merge});
};

// Must include a collection of {coll, doc, data} items.
// Input shape: [{coll, doc, data, merge}, ...]
export const setBatch = async items => {

  const db    = await initDb();
  const batch = writeBatch(db);

  items.forEach(item => {

    const merge = item.merge ?? true;
    const ref   = doc(db, item.coll, item.doc);

    if (merge) {
      batch.update(ref, item.data);
    }
    else {
      batch.set(ref, item.data);
    }
  });
  
  return batch.commit();
};

// @@@@@@ Get document data. @@@@@@@
//
// Must include 'coll' and 'doc'.
// Input shape: {coll, doc}
export const get = async job => {

  const db      = await initDb();
  const docData = await getDoc(doc(db, job.coll, job.doc));

  if (docData.exists) {
    return docData.data();
  }

  throw new Error(`No such document! ${coll}/${doc}`);
};

// @@@@@@ get all documents' data @@@@@
//
// Docs must be last level in the folder structure,
// otherwise, it returns an empty array.
//
// Must include 'coll'.
//
// Can optionally include 'endAt', 'limit', 'orderBy', 'startAt'.
//
// 'orderBy' --> {name, direction}
export const getAll = async job => {

  const db       = await initDb();
  const ref      = collection(db, job.coll);
  const params   = buildCompoundParams(job);
  const q        = queryColl(ref, ...params); 
  const snapshot = await getDocs(q);

  const allData = [];

  snapshot.forEach(doc => {
    allData.push(doc.data());
  });

  return allData;
};

// @@@@@@@@ Query a collection @@@@@
//
// Must include 'coll' and 'constraints'.
//
// Options: 'endAt', 'limit', 'orderBy', 'startAt'.
//
// 'constraints' is either an Object --> {comparator, field, operator} or 
// Array --> [{comparator, field, operator}].
export const query = async job => {

  const db          = await initDb();
  const ref         = collection(db, job.coll);
  const constraints = buildCompoundConstraints(job);
  const params      = buildCompoundParams(job);
  const q           = queryColl(ref, ...constraints, ...params);  
  const snapshot    = await getDocs(q);

  const allData = [];

  snapshot.forEach(doc => {
    allData.push(doc.data());
  });

  return allData;
};

// @@@@@ Subsribe to all doc changes @@@@@
//
// To stop listening to changes call the returned unsubscribe function.
//
// 'doc' optional if you want to subscribe to the entire collection.
//
// Returns a Promise that resolves to an 'unsubscribe' function.
//
// Input shape:
//  {coll, doc, callback, errorCallback, endAt, limit, orderBy, startAt}
export const subscribe = async job => {

  if (job.doc && (job.endAt || job.limit || job.orderBy || job.startAt)) {
    throw new Error('Cannot apply search options to a single document.');
  }

  const db  = await initDb();

  if (job.doc) {
    const q     = doc(db, job.coll, job.doc);
    const unsub = startSubscription(q, job.callback, job.errorCallback);

    return unsub;
  } 

  const ref    = collection(db, job.coll);
  const params = buildCompoundParams(job);
  const q      = queryColl(ref, ...params);
  const unsub  = startSubscription(q, job.callback, job.errorCallback);

  return unsub;
};

// @@@@@@@@ Subscribe to a query @@@@@@
//
// Must include 'coll' and 'constraints'.
//
// 'constraints' is either an Object --> {comparator, field, operator} or 
// Array --> [{comparator, field, operator}].
//
// Returns a Promise that resolves to an 'unsubscribe' function.
//
// Call 'unsubscribe' to stop getting updates/
export const querySubscribe = async job => {

  const db          = await initDb();
  const ref         = collection(db, job.coll);
  const constraints = buildCompoundConstraints(job);
  const params      = buildCompoundParams(job);
  const q           = queryColl(ref, ...constraints, ...params);
  const unsub       = startSubscription(q, job.callback, job.errorCallback);

  return unsub;
};

// @@@@@@@@ Delete a document @@@@@@@@@
//
// Must include 'coll' and 'doc'.
export const deleteDocument = async job => {

  const db = await initDb();

  return deleteDoc(doc(db, job.coll, job.doc));
};

// @@@@@@@@ Delete a field from a document @@@@@@
//
// Must include 'coll', 'doc' and 'field'.
export const deleteField = async job => {

  const db  = await initDb();
  const ref = doc(db, job.coll, job.doc);

  return updateDoc(ref, {[job.field]: deleteDocField()});
};

// @@@@@@@@ Batch Delete a set of documents @@@@@@
//
// Must include a collection of {coll, doc} items.
export const deleteBatch = async items => {

  const db    = await initDb();
  const batch = writeBatch(db);

  items.forEach(item => {

    const ref = doc(db, item.coll, item.doc);
    
    batch.delete(ref);
  });
  
  return batch.commit();
};

// NOT a full-text search solution!
// 
// Input shape: {coll, direction, limit, prop, text}
export const textStartsWithSearch = job => {

  const opts = {
    coll:    job.coll, 
    orderBy: {prop: job.prop, direction: job.direction}, 
    startAt: job.text, 
    endAt:  `${job.text}\uf8ff`,
    limit:   job.limit
  };

  return getAll(opts);
};
