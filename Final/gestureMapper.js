var coolDownDefault = 8, coolDownRemaining = coolDownDefault;

var prevDirection = 0, accumDiff = 0, accumAmp = 0, dirChanges = 0;

var binDecisionThreshold = 10, binReadRemaining = binDecisionThreshold;

setTimeout(clear, 2000);

function clear () {
	resetThresholds();
	dirChanges = 0;
	prevDirection = 0;
	console.log("clear");
	setTimeout( clear, 2500);
}
function resetThresholds() {
	/*
	 * Reset values
	 */
   	accumDiff = 0;
   	accumAmp = 0;
   	binReadRemaining = binDecisionThreshold;
}

function identifyGesture(args) {
	/*
	 * If still in the cool down period, ignore samples coming in
	 */
	if (coolDownRemaining > 0) {
		coolDownRemaining--;
		return;
	}

	//console.log("Cool Down Done");

	/*
	 * Cool Down done - process the sample if the values exceed the minimum threshold or if there is a definite shift in direction
	 */
	var diff = args.left - args.right;

	var dir = (diff < 0) ? -1 : ((diff > 0) ? 1 : 0);

	if ((diff > -2 && diff < 2)) {
		//console.log("Does not meet threshold ", args);
		return;
	}
	
	if (dir != prevDirection) {
		prevDirection = dir;
		dirChanges++;
		resetThresholds();
		//console.log(args, " ", diff);
		return;
	}

	/* 
	 * Read continuous same direction bins that meet these criteria and use their values only
	 */
	accumDiff += diff;
	accumAmp += args.peakAmp;
	binReadRemaining--;

	if (binReadRemaining == 0) {
		var avgDiff = accumDiff / binDecisionThreshold;
		var avgAmp = accumAmp / binDecisionThreshold;

		console.log("dir: ", dirChanges, "diff: ", avgDiff, "amp: ", avgAmp);
		var args = { "avgDiff" : avgDiff };
		if ((dirChanges == 2 && avgDiff >= 6 && avgAmp >= 92 && avgAmp <= 104) || dirChanges > 2) {
			/* Tap */
			console.log("Tap");
			chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Tap"});
		} else if (dirChanges <= 2) {
			/* Right or Down Movement */
			if (prevDirection == -1) {
				if (avgAmp > 115) {
					/* Right */
					console.log("right");
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Right", "args" : args});
				}
				else {
					/* Down */
					console.log("down");
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Down", "args" : args});
				}
			}
			/* Left or Up Movement */
			else if (prevDirection == 1) {
				if (avgAmp > 115) {
					/* Left */
					console.log("left");
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Left", "args" : args});
				}
				else {
					/* Up */
					console.log("up");
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Up", "args" : args});
				}
			}
		}

		resetThresholds();
		coolDownRemaining = coolDownDefault;
		prevDirection = 0;
		dirChanges = 0;
	}
}


chrome.runtime.onMessage.addListener(function (request, sender) {
	if (request.message == "SampledResult") {
		identifyGesture(request.args);
	} else if (request.message == "Start") {
		coolDownRemaining = coolDownDefault;
		dirChanges = 0;
		prevDirection = 0;
		resetThresholds();
	} else if (request.message == "Tap") {
		console.log("request.args");
	}
});
