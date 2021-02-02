

// Using CommonJS Modules syntax here as this 
// must work with node.js as well as webpack.
const mime = require('mime-types');


// NOTE:
//      'blobToFile' is NOT currently being imported form lambda.js
//      because the current version of Firebase Cloud Functions does
//      NOT yet support ES Modules, even though the Node.js version
//      is set to v14.X.
//
//      This us due to the fact that 'firebase-functions' and 
//      'firebase-admin' are not yet updated to the new syntax.
//
// Convert a blob object to a file object.
const blobToFile = (blob, name, type) =>
  new File([blob], name, {type: type ? type : blob.type});
  

// Accepts a file item object such as created by app-file-system.
// Returns true if there are no more cloud processes to complete.
// Either processed successfully or failed for all three versions.
const allProcessingRan = item => {

  const {
    optimized,
    optimizedError,
    poster, 
    posterError,
    thumbnail, 
    thumbnailError,
    type
  } = item;

  const isVid = type.startsWith('video/');

  const posterRan    = isVid ? Boolean(poster || posterError) : true;
  const optimizeRan  = Boolean(optimized || optimizedError);
  const thumbnailRan = Boolean(thumbnail || thumbnailError);

  return optimizeRan && posterRan && thumbnailRan;
};


// Accepts a File Object.
const canProcess = file => {
  const {type} = file;

  return type.startsWith('image/') &&
         (
           // These image types are supported by both 
           // the HTML <img/> tag and `wasm-imagemagick`.
           type.includes('bmp')  || 
           type.includes('gif')  || 
           type.includes('jpeg') ||
           type.includes('png')
         );
};


// Create a File Object from a canvas element's image data.
// Must provide the new file's name and extension.
const canvasToFile = (name, ext, canvas) => {
  const filename = `${name}${ext}`;
  const type     = mime.contentType(filename);

  const promise = new Promise(resolve => {

    canvas.toBlob(
      blob => {
        resolve(blobToFile(blob, filename, type));
      }, 
      type
    );
  });

  return promise;
};


// Accepts a File Object.
// Png/jpeg images and video files are post-processed.
const isCloudProcessable = file => {
  const {type} = file;

  return type && (canProcess(file) || type.includes('video'));
};


exports.allProcessingRan   = allProcessingRan;
exports.canProcess         = canProcess;
exports.canvasToFile       = canvasToFile;
exports.isCloudProcessable = isCloudProcessable;
