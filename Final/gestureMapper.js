var coolDownDefault = 8, coolDownRemaining = coolDownDefault;

var prevDirection = 0, accumDiff = 0, accumAmp = 0, dirChanges = 0;

var binDecisionThreshold = 10, binReadRemaining = binDecisionThreshold;

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

	if ((diff >= -2 && diff <= 2) || (dir == 0)) {
		console.log("Does not meet threshold ", args);
		return;
	}

	if (dir != prevDirection) {
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
		var avgAmp = accumDiff / binDecisionThreshold;

		//console.log("dir: ", dir, "diff: ", avgDiff, "amp: ", avgAmp);
		if (dirChanges == 1) {
			if (dir == -1) {
				/*
				 * Wrist Down or Hand Right depending on amp
				 * Do mouse movement or scroll depending on mouse mode variable
				 */
				console.log("Wrist Motion Down or Hand Motion Right");
			} else {
				/*
				 */
				console.log("Wrist Motion Up or Hand Motion Left");
			}
		} else if (dirChanges == 2) {
			/*
			 * Single Tap - Pause Video or Click based on mouse mode variable
			 */
			console.log("Tap");
		} else {
			/*
			 * For now mouse mode activation gestures have not been written
			 * Find number of direction changes for double tap and mouse mode via
			 * experimentation
			 */
			console.log("Double Tap or Mouse Mode");
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
	}
});
