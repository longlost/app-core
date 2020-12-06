

import {app, firebase}  from '../boot/boot.js';
import 'firebase/firestore';

    
const firestore = app.firestore();


// Working with Timestamps:

// Timestamps stored in Cloud Firestore will be read back as
// Firebase Timestamp objects instead of as system Date objects. 
//
// So you will also need to update code expecting a Date to 
// instead expect a Timestamp. 
//
// For example:
//
//   const timestamp = snapshot.get('created_at');
//   const date = timestamp.toDate();


const addOrderBy = (ref, orderBy) => {

	if (orderBy && (orderBy.name || orderBy.prop)) {
		const {direction = 'asc', name, prop} = orderBy;
		const by = name ? name : prop;

		ref = ref.orderBy(by, direction);
	}

	return ref;
};

// 'orderBy' --> {name or prop, direction}
const buildCompoundRef = ({coll, endAt, limit, orderBy, startAt}, ref) => {
	ref = ref || firestore.collection(coll);
	
	ref = addOrderBy(ref, orderBy);

	if (startAt) {
		ref = ref.startAt(startAt);
	}

	if (endAt) {
		ref = ref.endAt(endAt);
	}

	if (limit) {
		ref = ref.limit(limit);
	}
	
	return ref;
};


const buildCompoundQuery = (ref, query) => {

	if (Array.isArray(query)) {

		const compoundQuery = query.reduce((prev, curr) => {
			const {comparator, field, operator, orderBy} = curr;

			prev = prev.where(field, operator, comparator);

			// 'orderBy' --> {name or prop, direction}
			prev = addOrderBy(prev, orderBy);

			return prev;
		}, ref);

		return compoundQuery;
	}	

	const {comparator, field, operator, orderBy} = query;

	ref = ref.where(field, operator, comparator);

	return addOrderBy(ref, orderBy);
};

// 'subscribe' helper.
// Ref can be for entire collection or specific doc.
const getSubscribeRef = (coll, doc, endAt, limit, orderBy, startAt) => {

	if (doc && (endAt || limit || orderBy || startAt)) {
		throw new Error('Cannot apply search options to a single document.');
	}

	if (doc) {
		return firestore.collection(coll).doc(doc);
	}

	return buildCompoundRef({coll, endAt, limit, orderBy, startAt});
};

// 'subscribe' and 'querySubscribe' helper.
//
// Calls callback with document data.
//
// Returns a function that unsubscribes.
const startSubscription = (ref, cb, onError) => {
	return ref.onSnapshot(snapshot => {

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

// Offline, multi-tab persistence.
//
// See app-settings via app-shell.
//
// The state is held in local-storage in app-shell and
// can be changed by user in settings.
//
// Each device can have its own state
// in case user uses app on a shared device.
const enablePersistence = async () => {
	try {
		await firestore.enablePersistence({synchronizeTabs: true});		
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
const add = ({coll, data}) => {
	return firestore.collection(coll).add(data);
};

// Must include 'coll', 'doc' and 'data'.
const set = ({coll, doc, data, merge = true}) => {

	// 'set' with merge true create a document if one does not already exist
	// and will only overwrite specified fields that are passed in.
	return firestore.collection(coll).doc(doc).set(data, {merge});
};

// Must include a collection of {coll, doc, data} items.
const saveItems = items => {

	const batch = firestore.batch();

	items.forEach(item => {

		const {coll, doc, data, merge = true} = item;
		const ref = firestore.collection(coll).doc(doc);

		if (merge) {
			batch.update(ref, data);
		}
		else {
			batch.set(ref, data);
		}
	});
	
	return batch.commit();
};

// @@@@@@ Get document data. @@@@@@@
//
// Must include 'coll' and 'doc'.
const get = async ({coll, doc}) => {
	const docData = await firestore.collection(coll).doc(doc).get();

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
const getAll = async job => {
	const ref = buildCompoundRef(job);

	const snapshot = await ref.get();

	const allData = [];

	snapshot.forEach(doc => {
		allData.push(doc.data());
	});

	return allData;
};

// @@@@@@@@ Query a collection @@@@@
//
// Must include 'coll' and 'query'.
//
// Options: 'endAt', 'limit', 'orderBy', 'startAt'.
//
// 'query' is either an Object --> {comparator, field, operator} or 
// Array --> [{comparator, field, operator}].
const query = async job => {
	let ref = firestore.collection(job.coll);

	ref = buildCompoundQuery(ref, job.query);
	ref = buildCompoundRef(job, ref);

	const snapshot = await ref.get();

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
const subscribe = ({
	coll, 
	doc, 
	callback, 
	errorCallback, 
	endAt, 
	limit, 
	orderBy, 
	startAt
}) => {
	const ref 				= getSubscribeRef(coll, doc, endAt, limit, orderBy, startAt);
	const unsubscribe = startSubscription(ref, callback, errorCallback);

	return unsubscribe;
};

// @@@@@@@@ Subscribe to a query @@@@@@
//
// Must include 'coll' and 'query'.
//
// 'query' is either an Object --> {comparator, field, operator} or 
// Array --> [{comparator, field, operator}].
//
// Returns a Promise that resolves to an 'unsubscribe' function.
//
// Call 'unsubscribe' to stop getting updates/
const querySubscribe = job => {
	const {callback, errorCallback, query} = job;

	const ref 		 		= buildCompoundRef(job);
	const queryRef 		= buildCompoundQuery(ref, query);
	const unsubscribe = startSubscription(queryRef, callback, errorCallback);

	return unsubscribe;
};

// @@@@@@@@ Delete a document @@@@@@@@@
//
// Must include 'coll' and 'doc'.
const deleteDocument = ({coll, doc}) => {
	return firestore.collection(coll).doc(doc).delete();
};

// @@@@@@@@ Delete a field from a document @@@@@@
//
// Must include 'coll', 'doc' and 'field'.
const deleteField = ({coll, doc, field}) => {
	return firestore.collection(coll).doc(doc).
		update({[field]: firebase.firestore.FieldValue.delete()});
};

// Must include a collection of {coll, doc, data} items.
const deleteItems = items => {

	const batch = firestore.batch();

	items.forEach(item => {

		const {coll, doc} = item;
		const ref = firestore.collection(coll).doc(doc);
		
		batch.delete(ref);
	});
	
	return batch.commit();
};

// NOT a full-text search solution!
const textStartsWithSearch = ({
	coll, 
	direction, 
	limit, 
	prop, 
	text
}) => {

	const orderBy = {prop, direction};

	const opts = {
		coll, 
		orderBy, 
		startAt: text, 
		endAt: 	`${text}\uf8ff`,
		limit
	};

	return getAll(opts);
};


export {
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
};
