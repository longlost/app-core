
/**
  *
  * `app-element-mixin`
  *
  *
  *   Common custom element convenience methods.
  *
  *
  *
  *   @customElement
  *   @polymer
  *   @demo demo/index.html
  *
  *
  **/

import {schedule} from './utils.js';


export const ElementMixin = superClass => {
  return class ElementMixin extends superClass {


    static get properties() {
      return {

        // Element lifecycle.
        customElementReady: Boolean,

        // Element lifecycle.
        customElementConnected: Boolean,

        // Unique deounce setTimeout reset id cache.
        _debouncers: {
          type: Object,
          value: () => ({})
        },

        // 'clicked' state indicating whether a tap 
        // handler is currently running or not.
        _clickDebouncerBusy: Boolean,

        _throttleBusy: Boolean

      };
    }
    

    constructor() {

      super();

      // Used to notify parent if lazy loaded.
      this.customElementReady = true;

      this.fire('custom-element-ready', {node: this});
    }


    async connectedCallback() {

      super.connectedCallback();

      await schedule();

      this.customElementConnected = true;

      this.fire('custom-element-connected', {node: this});
    }
    
    // @param <String> type CustomEvent name.
    // @param <Object> detail CustomEvent payload.
    // @param <Object> options CustomEvent config.
    // @return <Object> CustomEvent instance.
    fire(type, detail = {}, options = {}) {
      
      if (typeof type !== 'string') {
        throw new Error('first parameter must be a string');
      }

      const bubbles      = options.bubbles  === undefined ? true : options.bubbles;
      const cancelable   = Boolean(options.cancelable);
      const composed     = options.composed === undefined ? true : options.composed;
      const node         = options.node || this;
      const eventOptions = {detail, bubbles, cancelable, composed};
      const event        = new CustomEvent(type, eventOptions);
      
      node.dispatchEvent(event); 

      return event;
    }


    slotNodes(slotId) {

      // Ignore empty TEXT nodes.
      return this.select(slotId).
               assignedNodes({flatten: true}).
               filter(node => 
                 node.nodeName !== '#text' || 
                 node.textContent.trim());
    }
    

    slotHasNodes(slotId) {
      const nodes = this.slotNodes(slotId);

      return Array.isArray(nodes) && nodes.length > 0;
    }

    // @param <String> label Unique debounce identifier.
    // @param <Number> waitTime Debounce time in ms.
    // @return <Promise> void.
    //
    // User should place debounce inside a try catch
    // since subsequent calls to debounce will 
    // be rejected with 'debounced' as error.
    debounce(label, waitTime = 500) {

      // Clean up previous promise.
      if (this._debouncers[label]) {
        const {rejector, timeout} = this._debouncers[label];

        window.clearTimeout(timeout);

        rejector('debounced');
      }

      return new Promise((resolve, reject) => {

        const timeout = window.setTimeout(() => {

          window.requestAnimationFrame(() => {

            delete this._debouncers[label];

            resolve();
          });

        }, waitTime);

        this._debouncers[label] = {timeout, rejector: reject};
      });
    }


    async __clickDebouncer(waitTime) {

      try {
        await this.debounce('onClickDebounce', waitTime);
        
        this._clickDebouncerBusy = false;
      }
      catch (_) {}
    }

    // 'clicked' rejects the promise on every debounce, so consuming function
    // must use try/catch to handle the rejected promises from debouncing.
    // Rejects with 'click debounced' as the error.
    async clicked(waitTime = 500) {

      if (this._clickDebouncerBusy) { 
        this.__clickDebouncer(waitTime);

        throw 'click debounced'; 
      }

      this._clickDebouncerBusy = true;

      await schedule();

      this.__clickDebouncer(waitTime);
    }  

    // @param <String> selector Css/Html selector string.
    // @param <Object> context HTMLElement parent.
    // @return <Object> HTMLElement.
    select(selector, context = this) {

      return context.shadowRoot.querySelector(selector);
    }

    // @param <String> selector Css/Html selector string.
    // @param <Object> context HTMLElement parent.
    // @return <Array> HTMLElements.
    selectAll(selector, context = this) {

      return Array.from(context.shadowRoot.querySelectorAll(selector));
    }


    async __throttleDebouncer(waitTime) {

      try {
        await this.debounce('throttle-debounce', waitTime);
        
        this._throttleBusy = false;
      }
      catch (_) {}
    }

    // 'throttle' runs the first invocation but throws on 
    // subsiquent invocations during the 'waitTime'.
    //
    // Consuming function must use try/catch to handle the 
    // thrown 'throttled' errors.
    throttle(waitTime = 500) {

      this.__throttleDebouncer(waitTime);

      if (this._throttleBusy) {
        throw 'throttled'; 
      }

      this._throttleBusy = true;
    }

  };
};
