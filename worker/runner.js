
// Starts up as many worker instances as 
// the workload demands, up to the maximum 
// number of virtual cores allowed by 
// `navigator.hardwareConcurrency - 1`.
//
// Optimized for battery life.
//
// When `options.terminateAfterIdle` is true, 
// automatically shutdown each worker when its 
// not being used for more than `options.idle` ms.
//
// Must pass in Worker Class because file paths
// cannot be variables in Webpack.

import * as Comlink     from 'comlink';
import * as concurrency from './concurrency.js';
import timer            from './timer.js';


// Worker class from webpack import.
// `options.idle` default to 2 seconds.
export default (Worker, options = {}) => {
  const {concurrence = true, idle = 2000, terminateAfterIdle = true} = options;

  // This unique id allows the concurrency module to 
  // reuse workers of the same type.
  const workerInstanceSymbol = Symbol(); // Only used for concurrence.

  const invocations = {};
  let singleton;


  // Time's up, shutdown the current worker, cleanup cached vals.
  const timerCallback = item => () => {
    if (concurrence) {
      concurrency.remove(item);
    }
    else {
      item.worker.terminate();
      item.proxy[Comlink.releaseProxy]();
    }
  };

  // Returns an object that contains a worker instance, the worker 
  // proxy, and other entries used for concurrency when applicable.
  const getWorkerItem = async () => {

    if (concurrence) {
      const item = await concurrency.get(Worker, workerInstanceSymbol);
      item.proxy = item.proxy || Comlink.wrap(item.worker);

      return item;
    }

    if (singleton) {
      return singleton;
    }

    singleton = {
      id:    'singleton',
      worker: new Worker()
    };  
 
    singleton.proxy = Comlink.wrap(singleton.worker);

    return singleton;
  };

  // Worker function name and function args.
  const run = async (name, ...args) => {    

    let workerItem;

    try {

      workerItem = await getWorkerItem();

      const {id} = workerItem;

      if (invocations[id]) {
        invocations[id].timer.stop();
        invocations[id].count += 1;
      }
      else {
        invocations[id] = {
          timer: timer(),
          count: 1
        };
      }

      const output = await workerItem.proxy[name](...args);

      return output;
    }
    catch (error) {
      throw error;
    }
    finally {

      if (workerItem) {
        const {id} = workerItem;

        invocations[id].count -= 1;

        if (invocations[id].count === 0 && terminateAfterIdle) {
          invocations[id].timer.start(idle, timerCallback(workerItem));
        }

        if (concurrence) {
          concurrency.markAvailable(workerItem.id);
        }
      }
    }
  };

  // Manually terminate a worker.
  // Defaults to terminate the 'oldest' worker.
  // Passing any other value results in terminating
  // the 'newest', or most recently added, worker.
  const terminate = (order = 'oldest') => {

    if (concurrence) {

      const item = concurrency.getForInstantTermination(workerInstanceSymbol, order);
      const {id} = item;

      concurrency.markAvailable(id);
      concurrency.remove(item);

      invocations[id] = undefined;
    }
    else {
      singleton.worker.terminate();
      singleton.proxy[Comlink.releaseProxy]();

      invocations['singleton'] = undefined;
      singleton                = undefined;
    }
  };


  return {run, terminate};
};
