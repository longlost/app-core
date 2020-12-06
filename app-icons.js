
import '@polymer/iron-iconset-svg/iron-iconset-svg.js';
import htmlString from './app-icons.html';

const appIcons 		 = document.createElement('div');
appIcons.innerHTML = htmlString;
appIcons.setAttribute('style', 'display: none;');
document.head.appendChild(appIcons);
