var coolDownDefault = 8, coolDownRemaining = coolDownDefault;

var prevDirection = 0, accumDiff = 0, accumAmp = 0, dirChanges = 0;

var binDecisionThreshold = 12, binReadRemaining = binDecisionThreshold;

var currentTabId = -1;

/*
 * Clear the gesture identification thresholds in the absence of any forthcoming
 * activity within the specified time duration
 */
function inactivityClear() {
	resetThresholds();
	dirChanges = 0;
	prevDirection = 0;
}

/*
 * Reset values
 */
function resetThresholds() {
   	accumDiff = 0;
   	accumAmp = 0;
   	binReadRemaining = binDecisionThreshold;
}

/*
 * main gesture identification function
 */
function identifyGesture(args) {
	clearInterval(inactivityClearer);
	/*
	 * If there's no follow-up gesture within 2.5 seconds, reset state
	 * this prevents actions occuring at varied time intervals being
	 * detected as belonging to the same gesture
	 */
	inactivityClearer = setTimeout(inactivityClear, 2500);

	/*
	 * There is a cool down period between successive gesture identifcation
	 * 
	 * If still in the cool down period, ignore samples coming in
	 */
	if (coolDownRemaining > 0) {
		coolDownRemaining--;
		return;
	}

	/*
	 * Cool Down done - process the sample if the values exceed the minimum threshold or
	 * if there is a definite shift in direction
	 */
	var diff = args.left - args.right;

	var dir = (diff < 0) ? -1 : ((diff > 0) ? 1 : 0);

	if ((diff >= 0 && diff <= 1)) {
		return;
	}

	/*
	 * If there is a change in direction, record it and reset thresholds
	 */
	if (dir != prevDirection && dir != 0) {
		prevDirection = dir;
		dirChanges++;
		resetThresholds();
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

		//console.log("dir: ", dirChanges, "diff: ", avgDiff, "amp: ", avgAmp);
		
		var args = { "avgDiff" : avgDiff , "dirChanges": dirChanges };
		
		if ((dirChanges == 2 && avgDiff >= 12 && avgAmp < 90) || 
			(dirChanges == 1 && avgDiff >= 12 && avgAmp < 90) ||
			dirChanges > 2) {
			/* 
			 * Tap
			 */
			args["amp"] = avgAmp;
			chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Tap", "args": args});

		} else if (dirChanges <= 2) {
			
			if (prevDirection == -1) {
				/*
				 * Hand movement Right or Down
				 */
				if (avgAmp > 108) {
					/* Right */
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Right",
						"args" : args});
				} else {
					/* Down */
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Down",
						"args" : args});
				}

			} else if (prevDirection == 1) {
				/* 
				 * Hand movement Left or Up
				 */
				if (avgAmp > 108) {
					/* Left */
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Left",
						"args" : args});
				} else {
					/* Up */
					chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Up",
						"args" : args});
				}
			}
		}

		/*
		 * Reset thresholds on detected actions
		 */
		resetThresholds();
		coolDownRemaining = coolDownDefault;
		prevDirection = 0;
		dirChanges = 0;
	}
}

chrome.runtime.onMessage.addListener(function (request, sender) {
	if (request.message == "SampledResult") {
		identifyGesture(request.args);
		currentTabId = request.tab;

	} else if (request.message == "Start") {
		coolDownRemaining = coolDownDefault;
		dirChanges = 0;
		prevDirection = 0;
		resetThresholds();
	}
});
