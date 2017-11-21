var gestureHistory = [];
var historySize = 3;
var currentIndex = 0;

function movementVertical(args, type, fullScreenElement) {

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
	}
}

function findCurrentTabIdx() {
	for (var i = 0; i < window.tab.length; i++) {
		if (window.tab[i].active) {
			return i;
		}
	}
}

function movementHorizontal(args, type, fullScreenElement) {
	
	if (fullScreenElement == undefined) {
		if (gestureHistory.length != historySize) {
			return;
		}

		var previousGesture = gestureHistory[(current + historySize - 1) % historySize];
		var beforePreviousGesture = gestureHistory[(current + historySize - 2) % historySize];

		if (type == gestureHistory[currentIndex] &&
			type == previousGesture && type == beforePreviousGesture) {
			var currentTabIdx = findCurrentTabIdx();
			var newTabIdx = undefined;

			if (gestureType == "Left") {
				/*
				 * 3 Successive Lefts
				 */
				 newTabIdx = (currentTabIdx + window.tabs.length - 1) % window.tabs.length;

			} else {
				/*
				 * 3 Successive Rights
				 */
				 newTabIdx = (currentTabIdx + window.tabs.length + 1) % window.tabs.length;
			}
			
			// Send message to enable SoundWave on new Tab
			chrome.runtime.sendMessage({"tab" : window.tabs[newTabIndex].id,
				"message": "EnableSoundWave"});

			chrome.tabs.update(newTabIdx);

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			"Right" == previousGesture && type == beforePreviousGesture) {
				/*
				 * L R L action - Create new Tab
				 */
				 chrome.tabs.create(function (newTab) {
				 	// Send message to enable SoundWave on new Tab
					chrome.runtime.sendMessage({"tab" : newTab.id,
						"message": "EnableSoundWave"});	
				 });

		} else if (type == "Right" && type == gestureHistory[currentIndex] &&
			"Left" == previousGesture && type == beforePreviousGesture) {
				/*
				 * R L R action - Close current Tab
				 */
				 chrome.tabs.remove(window.tabs[currentTabIdx()]);

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			"Left" == previousGesture && type == beforePreviousGesture) {
				/*
				 * R L L action - Reopen last closed Tab
				 */
				 chrome.tabs.restore(function (restoredSession) {
				 	// Send message to enable SoundWave on restored tab
					chrome.runtime.sendMessage({"tab" : restoredSession.tab.id,
						"message": "EnableSoundWave"});
				});
		}
		
		gestureHistory = []
		currentIndex = 0;
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

function movementTap(args, type, fullScreenElement) {

	if (fullScreenElement != undefined) {
		
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
	} else {
		if (args.avgDiff > 0) {
			movementVertical(args, "Up", fullScreenElement);
		} else {
			movementVertical(args, "Down", fullScreenElement);
		}
	}
}

function checkFullScreen(args, type, callback) {

	var fullScreenElement = (document.fullscreenElement || document.webkitFullscreenElement);

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
