var gestureHistory = [], historySize = 3, currentIndex = 0;

var inactivityClearer = setTimeout(inactivityClear, 8000);

/*
 * Clear the gesture history in the absence of any forthcoming
 * activity within the specified time duration
 */
function inactivityClear() {
	gestureHistory = [];
	currentIndex = 0;
}

/*
 * Map vertical hand gestures to browser actions
 */
function movementVertical(args, type, fullScreenElement) {
	console.log(type);

	/*
	 * If there is no full screen media playback, map vertical
	 * actions to browser vertical scrolls
	 *
	 * For full screen media playback, map vertical actions
	 * to volume controls
	 */
	if (fullScreenElement == undefined) {
		var speed = Math.abs(args.avgDiff) * 100;

		if (type == "Up") {
			speed *= -1;
		}

		window.scrollBy(0, speed);
	
	} else {
		var media = (fullScreenElement.getElementsByTagName('video') ||
			fullScreenElement.getElementsByTagName('audio'))[0];

		if (media == undefined) {
			return;
		}

		var increase = Math.abs(args.avgDiff) / 30.0;

		if (type == "Down") {
			increase *= -1;
		}

		if (media.volume + increase > 1.0) {
			media.volume = 1.0;
		} else if (media.volume + increase < 0.0) {
			media.volume = 0.0;
		} else {
			media.volume += increase;
		}

		console.log("New Volume = ", media.volume);
	}
}

/*
 * Map horizontal hand gestures to browser actions
 */
function movementHorizontal(args, type, fullScreenElement) {
	console.log(type);
	
	/*
	 * If there is no full screen media playback, map combination of horizontal
	 * actions to varied browser actions
	 *
	 * For full screen media playback, map horizontal actions to media rewind/fast forward
	 * controls
	 */
	if (fullScreenElement == undefined) {
		if (gestureHistory.length != historySize) {
			return;
		}

		/*
		 * Since, some of the chrome actions cannot be performed by content scripts
		 * send the browser action to be performed to the background script
		 */
		var previousGesture = gestureHistory[(currentIndex + historySize - 1) % historySize];
		var beforePreviousGesture = gestureHistory[(currentIndex + historySize - 2) % historySize];
		
		if (type == gestureHistory[currentIndex] &&
			type == previousGesture && type == beforePreviousGesture) {
				if (type == "Left") {
					/*
					 * 3 Successive Lefts
					 */
					var args = { "action" : "MoveToLeftTab" };
					chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
					gestureHistory = [];
					currentIndex = -1;
	
				} else {
					/*
					 * 3 Successive Rights
					 */
					var args = { "action" : "MoveToRightTab" };
					chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
					gestureHistory = [];
					currentIndex = -1;
				}

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			"Right" == previousGesture && type == beforePreviousGesture) {
				/*
				 * L R L action - Create new Tab
				 */
				var args = { "action" : "CreateNewTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
				gestureHistory = [];
				currentIndex = -1;

		} else if (type == "Right" && type == gestureHistory[currentIndex] &&
			"Left" == previousGesture && type == beforePreviousGesture) {
				/*
				 * R L R action - Close current Tab
				 */
				var args = { "action" : "CloseCurrentTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
				gestureHistory = [];
				currentIndex = -1;

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			type == previousGesture && beforePreviousGesture == "Right") {
				/*
				 * R L L action - Reopen last closed Tab
				 */
				var args = { "action" : "ReopenClosedTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
				gestureHistory = [];
				currentIndex = -1;
		
		} else if (type == "Right" && type == gestureHistory[currentIndex] &&
			previousGesture == "Left" && beforePreviousGesture == "Left") {
				/*
				 * L L R action - Detect primary language in current tab
				 */
				var args = { "action" : "DetectLanguage" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
				gestureHistory = [];
				currentIndex = -1;
		
		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			previousGesture == "Right" && beforePreviousGesture == "Right") {
				/*
				 * R R L action - Change white background color to gray
				 */
				document.body.style.backgroundColor = "gainsboro";
				gestureHistory = [];
				currentIndex = -1;
		
		}  else if (type == "Right" && type == gestureHistory[currentIndex] &&
			previousGesture == type && beforePreviousGesture == "Left") {
				/*
				 * L R R action - Change gray background color to white
				 */
				document.body.style.backgroundColor = "white";
				gestureHistory = [];
				currentIndex = -1;
		}

	} else {
		var media = (fullScreenElement.getElementsByTagName('video') ||
			fullScreenElement.getElementsByTagName('audio'))[0];

		if (media == undefined) {
			return;
		}

		var speed = Math.abs(args.avgDiff) * 5;

		if (type == "Left") {
			speed *= -1;
		}

		media.currentTime += speed;
	}
}

/*
 * map "Tap" like hand gesture to browser action
 */
function movementTap(args, type, fullScreenElement) {
	
	/*
	 * For full screen media playback, map Tap gesture to media play/pause
	 */
	if (fullScreenElement != undefined) {
		console.log(type);

		var media = (fullScreenElement.getElementsByTagName('video') ||
			fullScreenElement.getElementsByTagName('audio'))[0];

		if (media == undefined) {
			return;
		}

		var isPaused = media.paused;
		
		if (isPaused) {
			media.play();
		} else {
			media.pause();
		}
	}
}

/*
 * Modify Tap gesture to vertical/horizontal actions based on conditions
 * discussed below
 */
function modifyActionOnTap(args) {

	if (args.avgDiff > 0) {
		if (args.amp > 108) {
			/* Left */
			return { type: "Left", callback: movementHorizontal};
		}
		else {
			/* Up */
			return { type: "Up", callback: movementVertical};
		}

	} else {
		if (args.amp > 108) {
			/* Right */
			return { type: "Right", callback: movementHorizontal};;
		}
		else {
			/* Down */
			return { type: "Down", callback: movementVertical};;
		}			
	}

}

/*
 * Check if there is currently full screen media playback
 *
 * If yes, then possibly modify Tap gesture to vertical/horizontal gestures based
 * on media play/pause
 *
 * If there is no full screen media playback, directly modify Tap to vertical/horizontal
 * gestures
 */
function checkFullScreen(args, type, callback) {

	var fullScreenElement = (document.fullscreenElement || document.webkitFullscreenElement);
	
	var media = undefined;
	
	if (fullScreenElement != undefined) {
		media = (fullScreenElement.getElementsByTagName('video') ||
			fullScreenElement.getElementsByTagName('audio'))[0];
	}

	clearInterval(inactivityClearer);
	/*
	 * If there's no follow-up gesture within 8 seconds, reset state
	 */
	inactivityClearer = setTimeout(inactivityClear, 8000);

	/*
	 * While media is being played in the active tab, the Tap identification parameters change
	 */
	if ((fullScreenElement == undefined || (media.paused && args.dirChanges <= 2) || 
		(!media.paused && args.dirChanges <= 3)) && (type == "Tap")) {
		
		response = modifyActionOnTap(args);
		type = response.type;
		callback = response.callback;
	
	}

	gestureHistory[currentIndex] = type;

	callback(args, type, fullScreenElement);
	
	currentIndex = (currentIndex + 1) % historySize;

	/*
	 * Full Screen Mode - Reset gesture history to avoid incorrect
	 * interpretation if the current tab exits full screen mode
	 */
	if (fullScreenElement != undefined) {
		currentIndex = 0;
		gestureHistory = [];
		clearInterval(inactivityClearer);
	}
		
}

chrome.runtime.onMessage.addListener(function (request, sender) {
	if (request.message == "Up" || request.message == "Down" ||
		request.message == "Left" || request.message == "Right" ||
		request.message == "Tap") {
		var callback = undefined;

		if (request.message == "Up" || request.message == "Down") {
			callback = movementVertical;
		} else if (request.message == "Left" || request.message == "Right") {
			callback = movementHorizontal;
		} else if (request.message == "Tap") {
			callback = movementTap;
		}
		
		checkFullScreen(request.args, request.message, callback);
	}
});
