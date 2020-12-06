
// App specific service worker logic.

// This file should be included in workbox-webpack-plugin
// GenerateSW class via the importScripts config prop.  

self.addEventListener('message', async event => {

	// User taps on sw update toast 'Refresh' button.
	if (event.data && event.data.type === 'SKIP_WAITING') {

		// The call to self.skipWaiting() is already present in
		// auto-generated 'service-worker.js' file.

		// Current tab will refresh once this sw has
		// taken over control via the 'controlling' event,
		// so message any other open tabs to reload via postMessage.

		self.clients.claim();

    const clients = await self.clients.matchAll();
    
    clients.forEach(client => client.postMessage({type: 'WAITING_SKIPPED'}));
	}
});