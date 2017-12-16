/*
 * Detect Key Press and Key Release events and
 * inform the background script so that it blocks
 * any gestures detected as a result of user typing on the
 * keyboard
 */

document.addEventListener('keydown', (event) => {
	chrome.runtime.sendMessage({"message" : "KeyPress"});
});

document.addEventListener('keyup', (event) => {
	chrome.runtime.sendMessage({"message" : "KeyRelease"});
});
