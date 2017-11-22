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

function movementHorizontal(args, type, fullScreenElement) {
	
	if (fullScreenElement == undefined) {
		if (gestureHistory.length != historySize) {
			return;
		}
		console.log("his: ", gestureHistory);
		var previousGesture = gestureHistory[(currentIndex + historySize - 1) % historySize];
		var beforePreviousGesture = gestureHistory[(currentIndex + historySize - 2) % historySize];

		if (type == gestureHistory[currentIndex] &&
			type == previousGesture && type == beforePreviousGesture) {
				if (type == "Left") {
					/*
					 * 3 Successive Lefts
					 */

					// Send message to enable SoundWave on Left Tab and perform the action
					var args = { "action" : "MoveToLeftTab" };
					chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
	
				} else {
					/*
					 * 3 Successive Rights
					 */

					// Send message to enable SoundWave on Right Tab and perform the action
					var args = { "action" : "MoveToRightTab" };
					chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
				}

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			"Right" == previousGesture && type == beforePreviousGesture) {
				/*
				 * L R L action - Create new Tab
				 */
				
				// Send message to enable SoundWave on new Tab and perform the action
				var args = { "action" : "CreateNewTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});

		} else if (type == "Right" && type == gestureHistory[currentIndex] &&
			"Left" == previousGesture && type == beforePreviousGesture) {
				/*
				 * R L R action - Close current Tab
				 */

				// Send message to enable SoundWave and perform the action
				var args = { "action" : "CloseCurrentTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});

		} else if (type == "Left" && type == gestureHistory[currentIndex] &&
			type == previousGesture && beforePreviousGesture == "Right") {
				/*
				 * R L L action - Reopen last closed Tab
				 */

				// Send message to perform the action and enable SoundWave on the previously closed tab
				var args = { "action" : "ReopenClosedTab" };
				chrome.runtime.sendMessage({"message" : "EnableSoundWave", "args" : args});
		}
		
		gestureHistory = [];
		currentIndex = -1;

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

	console.log(currentIndex);
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
