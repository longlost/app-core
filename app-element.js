
/**
	*
 	* PolymerElement extended class that adds common 
 	* and sugared functions to the Polymer base class.
 	*
 	* @customElement
 	* @polymer
 	* @memberof Polymer
 	* @constructor
 	* @implements {ElementMixin}
 	* @extends PolymerElement
 	* @appliesMixin ElementMixin
 	* @summary Adds commonly used helper functions to Polymer base class
 	*
	**/

import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import {ElementMixin} 				from './app-element-mixin.js';


const AppElement = ElementMixin(PolymerElement);

export {AppElement, html};
