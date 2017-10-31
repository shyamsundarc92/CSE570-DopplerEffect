var toggle = false;

chrome.browserAction.onClicked.addListener(function(tab) {
	toggle = !toggle;

	console.log(toggle);
	var code = 'window.location.reload();';


	if (toggle) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
		chrome.tabs.executeScript(tab.id, {file:"myscript.js"});
	} else {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		chrome.tabs.executeScript(tab.id, {code:code});
	}

});
