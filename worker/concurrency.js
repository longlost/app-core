
import * as Comlink from 'comlink';


const workers = {};

// A Promise that is resolved when a `workers` item is removed.
let openSlotPromise;
let markOpenSlot; // The resolve function for `openSlotPromise`.


const markBusy = workerItem => {
	const {id} = workerItem;
	const item = workers[id] || workerItem;

	item.busy = true;

	item.isAvailable = new Promise(resolve => {
		item.markAvailable = resolve;
	});

	return item;
};

const create = (id, Worker, instanceId) => {
	const newItem = {
		busy: false,
		id,
		instanceId,
		worker: new Worker()
	};

	const item = markBusy(newItem);

	return item;
};

const addNewItem = (...args) => {
	const item = create(...args);

	// Add to list.
	workers[item.id] = item;

	return item;
};

const waitForAvailability = async (Worker, instanceId) => {

	// Create the promise used to know when a new slot is opened by 
	// the removal of a different type of worker instance.
	openSlotPromise = new Promise(resolve => {
		markOpenSlot = resolve;
	});
	
	const items = Object.values(workers);
	const likes = items.filter(item => item.instanceId === instanceId);
	const availablilityPromises = likes.map(item => item.isAvailable);

	const val = await Promise.race([openSlotPromise, ...availablilityPromises]);

	openSlotPromise = undefined;
	markOpenSlot 		= undefined;

	// A new slot is available, so add a new item to the list.
	if (val === 'slot') {
		return addNewItem(items.length, Worker, instanceId);
	}

	// This worker is now available, so lets use it again.
	const item = markBusy(val);

	return item;
};

// A collection of Arrays each which represent first-in/first-out queues.
const waiting = {};

const waitingGen = async function* (Worker, instanceId) {

	try {
		while (true) {
			const ticket = waiting[instanceId].shift();

			const item = await waitForAvailability(Worker, instanceId);

			yield {item, ticket};

			if (waiting[instanceId].length === 0) {
				return;
			}
		}
	}
	finally {
		delete waiting[instanceId];
	}
};

const fulfillTickets = async iterator => {

	// Start iterating over the waiting list tickets.
	for await (const {item, ticket} of iterator) {

		// Resolve the promise with the worker item.
		ticket.fulfill(item);
	}		
};

const addToWaiting = async (Worker, instanceId) => {

	const ticket = {};

	ticket.promise = new Promise(resolve => {
		ticket.fulfill = resolve;
	});

	if (!waiting[instanceId]) {
		waiting[instanceId] = [ticket];

		const iterator = waitingGen(Worker, instanceId);

		// NOT awaiting this function, just starting the 
		// process of fulfilling them, one by one.
		fulfillTickets(iterator);		
	}
	else {	
		waiting[instanceId].push(ticket);
	}
	
	const item = await ticket.promise;

	return item;
};


export const get = async (Worker, instanceId) => {

	const items = Object.values(workers);
	const likes = items.filter(item => item.instanceId === instanceId);

	// Check if there is a like instance in the list that can be recycled.
	const available = likes.find(item => !item.busy);

	if (available) {
		const item = markBusy(available);

		return item; 
	}

	// Safari does not report the actual value.
	// Two is the minimum for iOS devices.
	//
	// Subtract 1 for the main thread process.
	const logicalProcessors = (window.navigator.hardwareConcurrency || 2) - 1;

	// Check if there is room for more workers.
	if (items.length < logicalProcessors) {
		return addNewItem(items.length, Worker, instanceId);
	}

	// Max concurrency reached.
	// Must wait for a like instance to become available or for an empty slot.
	const item = await addToWaiting(Worker, instanceId);

	return item;
};

// Return a concurrent worker item based on the order which it was added,
// regardless if it is busy or not.
export const getForInstantTermination = (instanceId, order = 'oldest') => {	
	const items = Object.values(workers);

	// Find workers of a particular instance, 
	// then sort them in ascending order according to id
	// which orders them as they were added chronologically.
	const likes = items.
		filter(item => item.instanceId === instanceId).
		sort((a, b) => a.id - b.id);

	if (order === 'oldest') {
		return likes[0];
	}

	return likes[likes.length - 1];
};


export const markAvailable = id => {
	const item = workers[id];

	item.busy = false;
	item.markAvailable(item);

	workers[id] = item;
};

// Find the item by id.
// Kill the instance then take out of `workers` list.
export const remove = ({id, proxy}) => {
	const {busy, worker} = workers[id];

	if (busy) { return; }

	worker.terminate();

	delete workers[id];

	proxy[Comlink.releaseProxy]();

	if (markOpenSlot) {
		markOpenSlot('slot');
	}
};
