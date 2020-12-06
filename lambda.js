
// Partial function application.
// Function -> Function or Any
const curry = func => {
  const arity   = func.length;
  const curried = (...a) => a.length >= arity ? func(...a) : (...b) => curried(...a, ...b);
  return curried;                                      
};

// Long form.
// const curry = func => {
//  const arity   = func.length;
//  const curried = (...args) => {
//    const enoughArgs = args.length >= arity;
//    if (enoughArgs) {
//      return func(...args);
//    }
//    return (...newArgs) => curried(...args, ...newArgs);
//  };
//  return curried;
// };

// Chain multiple pure functions together.
// Functions -> Function
const compose = (...funcs) => {
  const arity = funcs.length;
  if (arity === 0) { return; }

  const foundNonFunction = funcs.find(func => typeof func !== 'function');
  if (foundNonFunction) { throw new Error('compose only accepts functions as arguments'); }

  return (x, ...rest) => {
    if (rest.length > 0) { throw new Error('a composed function can only accept one argument'); }
    // Work array last to first.
    const index = arity - 1;

    if (index === 0) { return funcs[0](x); }
    // const run = (f, g, i) => i === 0 ? f(g(x)) : f(run(g, funcs[i - 1], i - 1));
    const run = (f, g, i) => {
      if (i === 0) {
        return f(g(x));
      }
      return f(run(g, funcs[i - 1], i - 1));
    };

    return run(funcs[index], funcs[index - 1], index - 1);
  };
};

// Boost performance on repeat requests 
// to a function when run with exact 
// arguments as prior invocations.
// Function -> Any
const memoize = func => {
  if (typeof func !== 'function') { return new TypeError('memoize only accepts a function'); }
  const cache = {};
  return (...args) => {
    const argStr  = JSON.stringify(args);
    cache[argStr] = cache[argStr] || func(...args);
    return cache[argStr];
  };
};

// Use trace to debug function pipelines using compose().
// String, Any -> Any
const trace = curry((tag, x) => {
  console.log(tag, x); // eslint-disable-line no-console
  return x;
});

// Array2D -> Array
const flatten = (arrays, depth = 1) => arrays.flat(depth);

// Function, Array -> Array
const map = curry((func, array) => array.map(func));

// Function, Array2D -> Array 
const flatMap = curry((func, arrays) => arrays.flatMap(func));

// String -> Array
const letters = str => str.split('');

// Array -> Any
const head = array => array[0];

// Array -> Any
const tail = array => array[array.length - 1];

// String -> String
const lowerCase = str => str.toLowerCase();

// String -> String
const upperCase = str => str.toUpperCase();

// String -> String
const trim = str => str.trim();

// String, String -> Array
const split = curry((separator, str) => str.split(separator));

// String, Array -> String
const join = curry((joiner, array)  => array.join(joiner));

// Number, Array -> Array
const take = curry((end, array)     => array.slice(0, end));

// Number, Array -> Array
const rest = curry((start, array)   => array.slice(start));

// Pure pop implementation.
// Array -> Array
const pop = array => {
  const [first, ...rest] = array.reverse();
  return rest.reverse();
};

// Pure push implementation.
// Add one or more items to the end of an array.
// Array, Any -> Array
const push = curry((array, element, ...rest) => 
               [...array, element, ...rest]);

// Pure shift implementation.
// Array -> Array
const shift = array => {
  const [first, ...rest] = array;
  return rest;
};

// Pure splice implementation.
// Argumentss reordered for composition.
// insert: Array
// remove: Number
// index: Number
// Any, Number, Number, Array -> Array
const splice = curry((insert, remove, index, array) => {
  if (typeof index !== 'number') { throw new TypeError('splice index must be a number'); }
  if (!Array.isArray(array))     { throw new TypeError('splice array must be an array'); }
  const inserted  = insert || [];
  const removeQty = typeof remove === 'number' ? remove : 0;
  const beginning = array.slice(0, index); 
  const end       = array.slice(index + removeQty);
  return [...beginning, ...inserted, ...end];
});

// Delete one item from an array.
// Number, Array -> Array
const removeOne = splice(undefined, 1);

// Capitalize the first letter in a string.
// String -> String
const capitalize = str => {
  if (!str) { return str; }
  const capFirst = compose(letters, head,    upperCase);
  const getRest  = compose(letters, rest(1), join(''));
  const first    = capFirst(str);
  const end      = getRest(str);
  return `${first}${end}`;
};

// Format a number or string to a 
// human readable monies format.
// String or Number -> String
const currency = (num, type = 'USD') => 
  Number(Number(num).toFixed(2)).
    toLocaleString(undefined, {
      style:   'currency', 
      currency: type
    });

// Accepts number strings or numbers.
// Calculates taxes and total after taxes.
// 'taxRate' argument is the tax percentage (ie. 8.25).
const calcPrice = curry((taxRate, subTot) => {
  const taxDecimal   = Number(taxRate) / 100;
  const taxTot       = Number(subTot) * taxDecimal;
  const totalInt     = Number(subTot) * (100 + (taxDecimal * 100));
  const totalDecimal = Math.round(totalInt) / 100;
  const total        = currency(totalDecimal);
  const tax          = currency(taxTot);
  const subtotal     = currency(subTot);
  return {subtotal, tax, total};
});

// Output is forced between a min and max.
// Number, Number, Number -> Number
const clamp = curry((min, max, num) => Math.min(Math.max(num, min), max));

// A deep copy of an object.
// Use wisely as there is a performance 
// penalty with large objects.
// Object -> Object
const deepClone = obj => JSON.parse(JSON.stringify(obj));

// Use a path string (ie. 'shipping.dimensions.height')
// to read a val in a nested object.
// String, Object -> Any
const accessByPath = curry((path, obj) => {
  const keys = path.split('.');
  return keys.reduce((accum, key) => accum[key], obj);
});

// Scale an input number range to an output number range.
const scale = curry((inputMin, inputMax, outputMin, outputMax, input) => {  
  const percent = (input - inputMin) / (inputMax - inputMin);
  const output  = percent * (outputMax - outputMin) + outputMin;
  return output;
});

// Transfrom an object-like item into a true object.
const toObj = objLike => {
  const obj = {};
  for (const prop in objLike) {
    obj[prop] = objLike[prop];
  }
  return obj;
};

// Convert a blob object to a file object.
const blobToFile = curry((blob, name, type) =>
  new File([blob], name, {type: type ? type : blob.type}));

// Convert a file object to a blob object.
const fileToBlob = file => new Blob([file]);

// Set the expected decimal places to safely
// add two or more numbers.
// Number -> Function -> Numbers -> Number
const addDecimals = places => (...nums) => {
  const multiple = 10 ** places;

  const sum = nums.reduce(
    (accum, num) => 
      (accum + (Number(num) * multiple)), 
    0
  );

  return sum / multiple;
};

// Set the expected decimal places to safely
// subtract two or more numbers.
// Number -> Function -> Numbers -> Number
const subtractDecimals = places => (...nums) => {
  const multiple = 10 ** places;

  const val = nums.reduce((accum, num) => {
    if (accum === null) { return Number(num) * multiple; }

    return accum - (Number(num) * multiple);
  }, null);

  return val / multiple;
};


export {
  accessByPath,
  addDecimals,
  blobToFile,
  calcPrice,
  capitalize,
  clamp,
  compose,
  currency,
  curry,
  deepClone,
  fileToBlob,
  flatten, 
  flatMap,
  head,
  join,
  letters,
  lowerCase,
  map,
  memoize,
  pop,
  push,
  removeOne,
  rest,
  scale,
  shift,
  splice,
  split,
  subtractDecimals,
  tail,
  take,
  toObj,
  trace,
  trim,
  upperCase
};
