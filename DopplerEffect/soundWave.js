console.log("Begin");

var audioContext = new AudioContext();

/*
 * Create an oscillator and configure it for sound tranmission
 */
var oscillator = audioContext.createOscillator();
oscillator.frequency.value = 20000; // Optimal Frequency found via experimentation
oscillator.start();

/*
 * Create Analyser for processing the audio data
 */
var analyser = audioContext.createAnalyser();

var repeat = 0, currentTabId = -1;

/*
 * Map given Frequency to FFT Bin Index
 */
function mapFreqToIndex(freq) {
	return Math.round(freq * (analyser.fftSize / audioContext.sampleRate));
}

/*
 * Map given FFT Bin Index to Frequency
 */
function mapIndexToFreq(idx) {
	return Math.round(idx * (audioContext.sampleRate / analyser.fftSize));
}

/*
 * Given a peak tone frequency, find the limit on requested side of the peak tone
 * -1 - Left Side Limit
 * 1  - Right Side Limit
 */
function findPeakLimits(audioData, direction, peakTone) {
	var peakToneBin = mapFreqToIndex(peakTone);
	/*
	 * As determined by the paper
	 */
	var frequencyBinLimit = 33;
	/*
	 * Determined by experimentation
	 */
	var amplitudeDropOffLimit = 0.005;

	var boundary = 0;

	/*
	 * No doppler shift observed in peak tone frequency - return
	 */
	if (audioData[peakToneBin] == 0) {
		//console.log("No change");
		return boundary;
	}

	while (++boundary <= frequencyBinLimit) {
		var idx = peakToneBin + boundary * direction;

		if ((direction == -1 && idx < 0) || (direction == 1 && idx >= analyser.frequencyBinCount)) {
			break;
		}

		var ratio = audioData[idx] / audioData[peakToneBin];
		
		//console.log(peakToneBin, idx, audioData[idx], audioData[peakToneBin], ratio);
		
		if (ratio < amplitudeDropOffLimit) {
			break;
		}
	}

	if (boundary > frequencyBinLimit) {
		boundary = frequencyBinLimit;
	}

	return boundary;
}

/*
 * Scans for the presence of a second peak with amplitude atleast 30% (as determined by the paper)
 * beyond the limits of the pilot tone peak and if present, finds its limits
 */
function checkForSecondaryPeak(audioData, direction, prevBoundary) {
	var primaryToneBin = mapFreqToIndex(oscillator.frequency.value);
	/*
	 * Determined by experimentation
	 */
	var secondaryPeakThreshold = 0.015;

	var boundary = 1;
	
	var found = false;

	while (true) {
		idx = primaryToneBin + (boundary + prevBoundary) * direction;

		if ((direction == -1 && idx < 0) || (direction == 1 && idx >= analyser.frequencyBinCount)) {
			break;
		}

		var ratio = audioData[idx] / audioData[primaryToneBin];
		
		//console.log(idx, audioData[idx], audioData[primaryToneBin], ratio);
		
		if (ratio >= secondaryPeakThreshold) {
			found = true;
			break;
		}

		boundary++;
	}

	if (found) {
		return findPeakLimits(audioData, direction, mapIndexToFreq(primaryToneBin + (boundary + prevBoundary) * direction));
	}

	return -1;
}


/*
 * Fetch and process data from the microphone
 */
function processAudioData() {
	var audioData = new Uint8Array(analyser.frequencyBinCount);

	analyser.getByteFrequencyData(audioData);

	/*
	 * Find the limits of the pilot tone peak
	 */
	//console.log("Pilot Left: ");
	
	var leftBoundary = findPeakLimits(audioData, -1, oscillator.frequency.value);
	
	//console.log("Pilot Right: ");
	
	var rightBoundary = findPeakLimits(audioData, 1, oscillator.frequency.value); 
	
	//console.log("Bound: ", leftBoundary + ":" + rightBoundary);

	/*
	 * Do a scan for the second peak beyond of the pilot tone peak
	 * and if a peak with atleast 30% of the amplitude of the pilot tone is
	 * found, find its limits and change boundaries found earlier
	 *
	 * Do this scan only if there was a pilot tone peak in the first place
	 */	
	if (leftBoundary != 0) {
		//console.log("Secondary Left: ");
		var secondaryLeftBoundary = checkForSecondaryPeak(audioData, -1, leftBoundary);
		
		if (secondaryLeftBoundary != -1 && secondaryLeftBoundary < leftBoundary) {
			leftBoundary = secondaryLeftBoundary;
		}
	}
	
	if (rightBoundary != 0) {
		//console.log("Secondary Right: ");
		var secondaryRightBoundary = checkForSecondaryPeak(audioData, 1, rightBoundary);
		
		if (secondaryRightBoundary != -1 && secondaryRightBoundary > rightBoundary) {
			rightBoundary = secondaryRightBoundary;
		}
	}

	repeat = setTimeout(processAudioData, 10);

	//console.log("Final: left: ", leftBoundary, "Right: ", rightBoundary);

	var args = {"left" : leftBoundary, "right" : rightBoundary, "peakAmp" : audioData[mapFreqToIndex(oscillator.frequency.value)]};

	chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "SampledResult", "args" : args});
}

function startSoundWave() {
	oscillator.connect(audioContext.destination);

	processAudioData();
}

function stopSoundWave() {
	oscillator.disconnect(audioContext.destination);

	clearInterval(repeat);
}

function initSoundWave() {
	navigator.getMedia = (navigator.getUserMedia || navigator.webKitGetUserMedia);

	navigator.getMedia({audio: { optional: [{ echoCancellation: false }] } }, function(streamSource) {
		console.log("Connect mic");
		/*
		 * Create Microphone audio source and connect analyser to it
		 */
		var source = audioContext.createMediaStreamSource(streamSource);

		source.connect(analyser);
		
		startSoundWave();

	}, function() { alert("Please allow Microphone Access")});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	//console.log("Message Received");

	if (request.message == "Init") {
		console.log("Init & Start");
		initSoundWave();
		currentTabId = request.tab;
	} else if (request.message == "Start") {
		console.log("Start");
		startSoundWave();
	} else if (request.message == "Stop") {
		console.log("Stop");
		stopSoundWave();
	}
});

console.log("End");
