document.addEventListener('keydown', (event) => {
	chrome.runtime.sendMessage({"message" : "KeyPress"});
});

document.addEventListener('keyup', (event) => {
	chrome.runtime.sendMessage({"message" : "KeyRelease"});
});
