

// Using CommonJS Modules syntax here as this 
// must work with node.js as well as webpack.

const {blobToFile} = require('./lambda.js');
const mime         = require('mime-types');


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
           // the HTML <img/> tag and ImageMagick.
           type.includes('bmp')  || 
           type.includes('gif')  || 
           type.includes('jpeg') ||
           type.includes('png')  || 
           type.includes('webp')
         );
};


// Accepts a File Object.
const canReadExif = file => {
  const {type} = file;

  return type.startsWith('image/') &&
         (
           // These image types are supported by both 
           // the HTML <img/> tag and `exifreader` library.
           type.includes('jpeg') ||

           // TODO:
           //
           //   Switch 'exifreader' library for wasm-imagemagick
           //   'identify -verbose' command, which includes exif info


           // PNG xmp info not available for exifreader, but may
           // be available to ImageMagick 'identify -verbose'
           
           // type.includes('png')  ||


           type.includes('webp')
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


exports = {
  allProcessingRan,
	canProcess,
	canReadExif,
  canvasToFile,
	isCloudProcessable
};
