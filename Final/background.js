/*
 * State tracker
 */
var state = {
   STOPPED:	0,
   RUNNING:	1,
};

/*
 * keeps tracks of the state of the SoundWave extension in each browser tab
 */
var tabsInUse = {}

/*
 * Main Function that controls the state of SoundWave in each tab
 */
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
 *
 * This is because these actions cannot be performed by content scripts
 * themselves are they are not permitted to do so
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
			 * Shift to left/right tab and enable SoundWave for it
			 */
			chrome.tabs.update(tabs[newTabIdx].id, {active: true});
			
			if (tabsInUse[tabs[newTabIdx].id] != state.RUNNING) {
				setTimeout(function () { extensionAction(tabs[newTabIdx].id); }, 2000);
			}

		} else if (request.args.action == "CreateNewTab") {
			/*
			 * Create a new tab and enable SoundWave for it
			 */
			chrome.tabs.create({active: true, url: "https://www.google.com/"}, function (tab) {
				if (tabsInUse[tab.id] != state.RUNNING) {
					setTimeout(function () { extensionAction(tab.id); }, 2000);
				}
			});

		} else if (request.args.action == "CloseCurrentTab") {
			chrome.tabs.remove(request.tabId, function() {});

			/*
			 * Since current tab is closed, enable SoundWave for the now active tab
			 */
			setTimeout(function() {
				chrome.tabs.getSelected(null, function (tab) {
					var activeTabId = tab.id;
					
					if (tabsInUse[activeTabId] != state.RUNNING) {
						setTimeout(function () { extensionAction(activeTabId); }, 2000);
					}
				});
			}, 1000);

		} else if (request.args.action == "ReopenClosedTab") {
			chrome.sessions.restore(function (response) {

				/*
				 * Enable SoundWave for the reopened tab
				 */
				if (tabsInUse[response.tab.id] != state.RUNNING) {
					setTimeout(function () { extensionAction(response.tab.id); }, 2000);
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

function keyPressCoolDownDone() {
	isKeyPressed = false;
}

var keyPressCoolDown = undefined;

/*
 * Receive and service/forward messages from content scripts
 */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

	chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {

		if (request.message == "KeyPress") {
			isKeyPressed = true;
			clearInterval(keyPressCoolDown);
			return;
		}

		if (request.message == "KeyRelease") {
			/*
			 * After the final key in the type sequence is released, allow a 2 second cool down
			 * to prevent residual hand motion from being detected as
			 * a gesture
			 */
			keyPressCoolDown = setTimeout(KeyPressCoolDownDone, 2000);
			return;
		}

		if (request.tab != tabs[0].id || isKeyPressed) {
			console.log("keyPressed");
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

			/*
			 * Horizontal hand gesture triggered this message - perform appropriate
			 * gesture and enable SoundWave in tab if needed
			 */
			chrome.tabs.getSelected(null, function (tab) {
				var activeTabId = tab.id;
				request["tabId"] = activeTabId;
				request["tabIndex"] = tab.index;
				performAction(request);
			});
		}
	});
});
