# worker


## runner.js

This utility handles running multiple Web Worker instances.  

### Concurrence

Under the hood, it spreads work out in parallel, accross as many logical processors as the workload demands, up to the maximum number allowed by the browser, determined by `navigator.hardwareConcurrency`. When the workload becomes greater than the available number of concurrent processes, the runner enqueues incomming jobs, matching them with recycled workers or recently vacated cores as soon as they become available. Concurrence is the default behavior, but can be defeated by setting `options.concurrence` to `false`, when calling the factory function.

### Performance vs. Battery Life

Worker instances are allowed to remain idle for a short period before being automatically terminated. This is an attempt to lower the performance hit accrued by initializing new Worker instances. The default idle period of 2000ms can be changed by setting `options.idle`, when creating a new runner instance.

### Simple Example

Since runner.js uses the incredible [Comlink](https://github.com/GoogleChromeLabs/comlink) library to simplify Web Worker i/o, you will need to import it into each of your worker files and include each function that you wish to call from the main thread in its expose method.

npm install --save comlink @longlost/worker

or

yarn add comlink @longlost/worker

```
// Web Worker thread.
// my-cool-worker.js

import * as Comlink from 'comlink';


const myCoolFunction1 = (a, b, c) => {
	// ...some long running task.
};

const myCoolFunction2 = (a, b) => {
	// ...some long running task.
};


Comlink.expose({myCoolFunction1, myCoolFunction2});



// Main thread.
// app.js

import runner 	     from '@longlost/worker/runner.js';
import coolWorker    from './my-cool-worker.js';
import awesomeWorker from './my-awesome-worker.js';


(async function() {

	// These tasks will run in parallel, given the browser exposes more than one virtual core.
	const coolRunner = runner(coolWorker).run;

	// Optionally, force runner to run these tasks in series, with a one second idle time.
	const awesomeRunner = runner(awesomeWorker, {concurrence: false, idle: 1000}).run;


	const coolArgs1 = ['a', 'b', 'c'];

	const myCoolAndAwesomeResults = await Promise.all([
		coolRunner('myCoolFunction1', ...coolArgs1),
		coolRunner('myCoolFunction2', 'foo', 'bar'),
		awesomeRunner('myAwesomeFunction1', {baz: 'baz', qux: 'qux'}),
		awesomeRunner('myAwesomeFunction2')
	];

}());

```
