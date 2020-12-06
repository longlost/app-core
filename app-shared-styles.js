
/**
	*
	*		To use these across web components, 
	*		import this file in js and use the 'include' 
	*		keyword in the html <script> tag
	*
	*		.js
	*			
	* 		import '@longlost/app-shared-styles/app-shared-styles.js';
	*
	*
	*		.html
	*
	*			<style include="app-shared-styles">
	*
	*				... element specific css
	*
	* 		</style>
	*
 	*/

import htmlString from './app-shared-styles.html';

const sharedStyles = document.createElement('dom-module');
sharedStyles.innerHTML = htmlString;
sharedStyles.register('app-shared-styles');
