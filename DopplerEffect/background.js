/*
 * State tracker
 */
var state = {
   STOPPED:	0,
   RUNNING:	1,
};

/*
 * keeps tracks of the state of the extension in each browser tab
 */
var tabsInUse = {}

chrome.browserAction.onClicked.addListener(function(tab) {
	if (tabsInUse[tab.id] == undefined) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
		chrome.tabs.sendMessage(tab.id, {"tab" : tab.id, "message": "Init"});
		tabsInUse[tab.id] = state.RUNNING;
	} else if (tabsInUse[tab.id] == state.STOPPED) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
		chrome.tabs.sendMessage(tab.id, {"tab" : tab.id, "message": "Start"});
		tabsInUse[tab.id] = state.RUNNING;
	} else {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		chrome.tabs.sendMessage(tab.id, {"tab" : tab.id, "message": "Stop"});
		tabsInUse[tab.id] = state.STOPPED;
	}
});

chrome.runtime.onMessage.addListener(function(request, sender) {
	/*
	 * Receive and forward message between content scripts
	 */
	console.log("Forwarding message", request.message);

	if (request.message == "SampledResult") {
		chrome.tabs.sendMessage(request.tab, {"message" : request.message, "args" : request.args});
	}
});
