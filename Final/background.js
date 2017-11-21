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

function extensionAction(tabID) {
	if (tabsInUse[tabID] == undefined) {
		chrome.browserAction.setIcon({path: "on", tabId:tabID});
		chrome.tabs.sendMessage(tabID, {"tab" : tabID, "message": "Init"});
		tabsInUse[tabID] = state.RUNNING;
	} else if (tabsInUse[tabID] == state.STOPPED) {
		chrome.browserAction.setIcon({path: "on", tabId:tabID});
		chrome.tabs.sendMessage(tabID, {"tab" : tabID, "message": "Start"});
		tabsInUse[tabID] = state.RUNNING;
	} else {
		chrome.browserAction.setIcon({path: "off", tabId:tabID});
		chrome.tabs.sendMessage(tabID, {"tab" : tabID, "message": "Stop"});
		tabsInUse[tabID] = state.STOPPED;
	}

}

chrome.browserAction.onClicked.addListener(function (tab) {
	extensionAction(tab.id);
});

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
	delete tabsInUse[tabId];
});

/*
 * On tab update - restore to correct state - DEBUG NOT WORKING!

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if ((tabsInUse[tab.id] == undefined) || (tabsInUse[tab.id] == state.STOPPED)) {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		delete tabsInUse[tab.id];
	} else if (tabsInUse[tab.id] == state.RUNNING) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
	}
});
*/

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	/*
	 * Receive and service/forward messages from content scripts
	 */
	console.log("Recvd message", request.message);

	if (request.message == "SampledResult" || request.message == "Up" ||
		request.message == "Down" || request.message == "Left" ||
		request.message == "Right" || request.message == "Tap") {
		if (!("args" in request)) {
			request["args"] = undefined;
		}
		chrome.tabs.sendMessage(request.tab, request);
	} else if (request.message == "Error") {
		delete tabsInUse[request.tab];
		chrome.browserAction.setIcon({path: "off", tabId:request.tab});
	} else if (request.message == "EnableSoundWave") {
		delete tabsInUse[request.tab];
		extensionAction(request.tab.id);
	}
});
