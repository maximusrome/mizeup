const target = document.head || document.documentElement;
const script = document.createElement('script');
script.src = chrome.runtime.getURL('posthog.js');
script.onload = function() {
  const init = document.createElement('script');
  init.src = chrome.runtime.getURL('init.js');
  target.appendChild(init);
};
target.appendChild(script);
