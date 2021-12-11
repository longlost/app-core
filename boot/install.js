
/**
  *
  *   This logic allows the app to display ui which lets 
  *   the user install the PWA to the home screen.
  *
  *
  **/


let installPromptEvent;
let installableResolver;
let installedResolver;


const installable = new Promise(resolve => {
  installableResolver = resolve;
});

const installed = new Promise(resolve => {
  installedResolver = resolve;
});


const beforeInstallPromptHandler = event => {

  // Stash the event so it can be triggered later.
  installPromptEvent = event;

  if (installableResolver) {
    installableResolver();
    installableResolver = undefined;
  }
};


const appInstalledHandler = event => {

  window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
  window.removeEventListener('appinstalled',        appInstalledHandler);

  // Clear the ref so it can be garbage collected.
  installPromptEvent = undefined;

  installedResolver(event);
};


window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
window.addEventListener('appinstalled',        appInstalledHandler);


// Test if the PWA is launched in a browser tab, 
// from an installed homescreen icon or 
// as a "Trusted Web Activity" from an Android app.
const getPWADisplayMode = () => {

  if (document.referrer.startsWith('android-app://')) {
    return 'twa'; // Trusted Web Activity.
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  if (navigator.standalone || isStandalone) {
    return 'standalone'; // Installed to homescreen.
  }

  return 'browser'; // Normal web app in browser.
};


const prompt = async () => {

  if (!installPromptEvent) { 
    throw new Error('Browser not ready to prompt.'); 
  }

  installPromptEvent.prompt();

  const choice = await installPromptEvent.userChoice;

  // Clear the ref so it can be garbage collected.
  installPromptEvent = undefined;

  return choice;
};


// Resolve the installed promise if already in installed mode.
const mode = getPWADisplayMode();

if (mode !== 'browser') {
  installableResolver();
  installedResolver(mode);
}


export {installable, installed, mode, prompt};
