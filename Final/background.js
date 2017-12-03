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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if (changeInfo.audible != undefined) {
		return;
	}

	if ((tabsInUse[tab.id] == undefined) || (tabsInUse[tab.id] == state.STOPPED)) {
		chrome.browserAction.setIcon({path: "off", tabId:tab.id});
		delete tabsInUse[tab.id];

	} else if (tabsInUse[tab.id] == state.RUNNING) {
		chrome.browserAction.setIcon({path: "on", tabId:tab.id});
		
		if (changeInfo.status == "complete") {
			chrome.tabs.sendMessage(tab.id, {"tab" : tab.id, "message": "Updated"});
		}
	}	
});

/*
 * Performs browser actions pertaining to horizontal gestures in response to
 * messages received from content scripts
 */
function performAction(request) {
	var length, newTabIdx;
	
	chrome.tabs.getAllInWindow(function (tabs) {
		length = tabs.length;

		if (request.args.action == "MoveToLeftTab" || request.args.action == "MoveToRightTab") {

			if (request.args.action == "MoveToLeftTab") {
				newTabIdx = (request.tabIndex + length - 1) % length;
			} else if (request.args.action == "MoveToRightTab") {
				newTabIdx = (request.tabIndex + length + 1) % length;
			}
		
			/*
			 * Enable SoundWave for the new active tab
			 */
			chrome.tabs.update(tabs[newTabIdx].id, {active: true});
			
			if (tabsInUse[tabs[newTabIdx].id] != state.RUNNING) {
				extensionAction(tabs[newTabIdx].id);
			}

		} else if (request.args.action == "CreateNewTab") {
			/*
			 * Enable soundWave for the new active tab
			 */
			chrome.tabs.create({active: true, url: "https://www.google.com/"}, function (tab) {
				if (tabsInUse[tab.id] != state.RUNNING) {
					extensionAction(tab.id);
				}
			});

		} else if (request.args.action == "CloseCurrentTab") {
			chrome.tabs.remove(request.tabId, function() {});

			
			/*
			 * Enable SoundWave for the newly active tab
			 */
			setTimeout(function() {
				chrome.tabs.getSelected(null, function (tab) {
					var activeTabId = tab.id;
					
					if (tabsInUse[activeTabId] != state.RUNNING) {
						extensionAction(activeTabId);
					}
				});
			}, 1000);

		} else if (request.args.action == "ReopenClosedTab") {
			chrome.sessions.restore(function (response) {
				

				/*
				 * Enable SoundWave for the new active tab
				 */
				if (tabsInUse[response.tab.id] != state.RUNNING) {
					extensionAction(response.tab.id);
				}	
			});

		} else if (request.args.action == "DetectLanguage") {
			chrome.tabs.detectLanguage(request.tabId, function (language) {
				window.alert("Language used in this page: " + language.toUpperCase());
			});
		
		}

	});

}

var isKeyPressed = false;

function KeyPressCoolDownDone() {
	isKeyPressed = false;
}

var keyPressCoolDown = undefined;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	/*
	 * Receive and service/forward messages from content scripts
	 */

	chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {

		if (request.message == "KeyPress") {
			isKeyPressed = true;
			clearInterval(keyPressCoolDown);
			return;
		}

		if (request.message == "KeyRelease") {
			keyPressCoolDown = setTimeout(keyPressCoolDownDone, 1000);
			return;
		}

		if (request.tab != tabs[0].id || isKeyPressed) {
			return;
		}

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
});
