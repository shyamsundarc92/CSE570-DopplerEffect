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
 * On tab update - restore to correct state
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if ((tabsInUse[tab.id] == undefined) || (tabsInUse[tab.id] == state.STOPPED)) {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		delete tabsInUse[tab.id];
		console.log("Reload");
	} else if (tabsInUse[tab.id] == state.RUNNING) {
		console.log("Reload - RUnning");
		extensionAction(tab.id);
		delete tabsInUse[tab.id];
		extensionAction(tab.id);
	}	
});
*/

function performAction(request) {
	var length, newTabIdx;
	chrome.tabs.getAllInWindow(function (tabs) {
		length = tabs.length;
		if (request.args.action == "MoveToLeftTab" || request.args.action == "MoveToLeftTab") {

			if (request.args.action == "MoveToLeftTab") {
				newTabIdx = (request.tabIndex + length - 1) % length;
			} else if (request.args.action == "MoveToRightTab") {
				newTabIdx = (request.tabIndex + length + 1) % length;
			}
			chrome.tabs.update(tabs[newTabIdx].id, {selected: true});
			delete tabsInUse[tabs[newTabIdx].id];
			extensionAction(tabs[newTabIdx].id);

		} else if (request.args.action == "CreateNewTab") {
			chrome.tabs.create({}, function (tab) {
				extensionAction(tab.id);
			});

		} else if (request.args.action == "CloseCurrentTab") {
			chrome.tabs.remove(request.tabId, function() {});

			/* Enabling SoundWave for current active tab after removing the previous active tab */
			/*chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
				delete tabsInUse[tabs[0].id];
				extensionAction(tabs[0].id);
				console.log(tabs);
			});*/

			setTimeout( function() {
				chrome.tabs.getSelected(null, function (tab) {
					var activeTabId = tab.id;
					//console.log(tab, request.tabId, activeTabId);
					delete tabsInUse[activeTabId];
					extensionAction(activeTabId);
				});
			}, 1000);

		} else if (request.args.action == "ReopenClosedTab") {
			chrome.sessions.restore(function (response) {
				//console.log(response, response.tab.id);
				delete tabsInUse[response.tab.id];
				extensionAction(response.tab.id);
			});

		}

	});

}

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
		chrome.tabs.getSelected(null, function (tab) {
			var activeTabId = tab.id;
			request["tabId"] = activeTabId;
			request["tabIndex"] = tab.index;
			performAction(request);
		});
	}
});
