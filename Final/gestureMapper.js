var coolDownDefault = 12, coolDownRemaining = coolDownDefault;

var dirInCurrentWindow = 0, accumDiff = 0, accumAmp = 0, dirChanges = 0;

var sampleDecisionThreshold = 10, sampleReadRemaining = sampleDecisionThreshold;

var currentTabId = -1;

/*
 * Clear the gesture identification thresholds in the absence of any forthcoming
 * activity within the specified time duration
 */
function inactivityClear() {
	resetThresholds();
	dirChanges = 0;
	dirInCurrentWindow = 0;
}

/*
 * Reset thresholds and start a new gesture identification window
 */
function resetThresholds() {
   	accumDiff = 0;
   	accumAmp = 0;
   	sampleReadRemaining = sampleDecisionThreshold;
}

/*
 * Theshold-based Gesture Identification Algorithm
 */
function identifyGesture(args) {
	if ((args.left - args.right) != 0) {
		/*
		 * If there's no follow-up gesture within 2.5 seconds, reset state
		 * this prevents actions occuring at varied time intervals being
		 * detected as belonging to the same gesture
		 */
		clearInterval(inactivityClearer);
		inactivityClearer = setTimeout(inactivityClear, 2500);
	}
	
	/*
	 * There is a cool down period between successive gesture identifcation
	 * If still in the cool down period, ignore samples coming in
	 */
	if (coolDownRemaining > 0) {
		coolDownRemaining--;
		return;
	}

	/*
	 * Cool Down done - process the sample if the values exceed the minimum threshold
	 *
	 * Thresholds determined by experimentation
	 */
	var diff = args.left - args.right;

	var dir = (diff < 0) ? -1 : ((diff > 0) ? 1 : 0);

	if ((diff >= 0 && diff <= 1)) {
		return;
	}

	/*
	 * If there is a change in direction, record it and reset thresholds to
	 * start a new gesture identification window
	 */
	if (dir != dirInCurrentWindow && dir != 0) {
		dirInCurrentWindow = dir;
		dirChanges++;
		resetThresholds();
		return;
	}

	/* 
	 * Read continuous same direction samples that meet these criteria
	 * and use their averages for gesture identification
	 */
	accumDiff += diff;
	accumAmp += args.peakAmp;
	sampleReadRemaining--;

	if (sampleReadRemaining == 0) {
		var avgDiff = accumDiff / sampleDecisionThreshold;
		var avgAmp = accumAmp / sampleDecisionThreshold;

		console.log("dir: ", dirChanges, "diff: ", avgDiff, "amp: ", avgAmp);
		
		var args = { "avgDiff" : avgDiff , "dirChanges" : dirChanges };
		
		if ((dirChanges == 2 && avgDiff >= 12 && avgAmp < 90) || 
			(dirChanges == 1 && avgDiff >= 12 && avgAmp < 90) ||
			(dirChanges > 2)) {
			/* 
			 * Double Tap motion
			 */
			args["amp"] = avgAmp;
			chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Tap", "args": args});

		} else {
			
			if (dirInCurrentWindow == -1) {
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

			} else if (dirInCurrentWindow == 1) {
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
		dirInCurrentWindow = 0;
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
		dirInCurrentWindow = 0;
		resetThresholds();
	}
});
