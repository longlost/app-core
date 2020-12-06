
import {blobToFile} from './lambda.js';
import path         from 'path'; // Provided by webpack when used on the client.


// Removes the extention from a given filename.
const stripExt = basename => 
  path.basename(basename, path.extname(basename));


// 'callback' will be passed an object with the following properties:
//
//    cancel, loaded, progress, total, type
//
// Calling 'cancel' will halt stream and throw an error
// with error.message set to 'Failed to fetch'.
const fetchBlob = async (url, callback, options) => {

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const reader = response.body.getReader();

  // Get total file length.
  const total = response.headers.get('Content-Length');

  // Get file type.
  const contentType = response.headers.get('Content-Type');
  const type        = contentType.split(';')[0];

  // Using stream in order to show a progress bar ui.
  const stream = new ReadableStream({
    start(controller) {

      // Read the data.
      let loaded = 0;
      // Calling cancel will halt stream and throw an error
      // with error.message set to 'Failed to fetch'.
      const cancel = controller.error.bind(controller);

      const pump = async () => {

        const {done, value} = await reader.read();

        // When no more data needs to be consumed, close the stream
        if (done) {
          controller.close();
          return;
        }

        loaded += value.length;

        if (callback) {
          const progress = total ? (loaded / total) * 100 : 100;

          callback({cancel, loaded, progress, total, type});
        }

        // Enqueue the next data chunk into our target stream
        controller.enqueue(value);

        return pump();
      };

      return pump();      
    }
  });

  const streamResponse = await new Response(stream);
  const blob           = await streamResponse.blob();
  const name           = path.basename(url);

  return {blob, name, type};
};


// 'callback' will be passed an object with the following properties:
//
//    cancel, loaded, progress, total, type
//
// Calling 'cancel' will halt stream and throw an error
// with error.message set to what was passed into 'cancel'.
const fetchFile = async (url, callback, options) => {
  
  const {blob, name, type} = await fetchBlob(url, callback, options);

  const file = blobToFile(blob, name, type);

  return file;
};


export {
  fetchBlob,
  fetchFile,
  stripExt
};
