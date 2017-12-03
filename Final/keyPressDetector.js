document.addEventListener('keydown', (event) => {
	console.log("Press");
	chrome.runtime.sendMessage({"message" : "KeyPress"});
});

document.addEventListener('keyup', (event) => {
	console.log("KeyUp");
	chrome.runtime.sendMessage({"message" : "KeyRelease"});
});
