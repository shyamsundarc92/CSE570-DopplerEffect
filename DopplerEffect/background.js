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
	if ((tabsInUse[tab.id] == undefined) || (tabsInUse[tab.id] == state.STOPPED)) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
		chrome.tabs.sendMessage(tab.id, {"message": "start"});
		tabsInUse[tab.id] = state.RUNNING;
	} else {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		chrome.tabs.sendMessage(tab.id, {"message": "stop"});
		tabsInUse[tab.id] = state.STOPPED;
	}
});
