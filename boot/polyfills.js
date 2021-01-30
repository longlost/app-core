
// Defer non essential polyfills until after load.
window.addEventListener('load', () => {

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {

      // Scroll options polyfill for Safari, supports {behavior: 'smooth'}
      // for all scroll functions (ie. window.scrollTo, element.scrollIntoVeiw).
      if (!('scrollBehavior' in document.documentElement.style)) {
        import(
          /* webpackChunkName: 'scroll-polyfill' */ 
          'scroll-behavior-polyfill'
        );
      }

    });
  });   
});
