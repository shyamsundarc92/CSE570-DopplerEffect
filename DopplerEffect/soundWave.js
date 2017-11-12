console.log("Begin");

var audioContext = new AudioContext();

/*
 * Create an oscillator and configure it for sound tranmission
 */
var oscillator = audioContext.createOscillator();
oscillator.start();

/*
 * Create Analyser for processing the audio data
 */
var analyser = audioContext.createAnalyser();

var repeat = 0;

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

	var boundary = 1;

	/*
	 * No doppler shift observed in peak tone frequency - return
	 */
	if (audioData[peakToneBin] == 0) {
		console.log("No change");
		return 0;
	}

	while (boundary <= frequencyBinLimit) {
		if (direction == -1 && (peakToneBin - boundary) < 0) {
			boundary = 0;
			break;
		} else if (direction == 1 && (peakToneBin + boundary) >= analyser.frequencyBinCount) {
			boundary = analyser.frequencyBinCount - 1;
			break;
		}

		var idx = 0;

		idx = peakToneBin + boundary * direction;		

		var ratio = audioData[idx] / audioData[peakToneBin];
		
		//console.log(peakToneBin, idx, audioData[idx], audioData[peakToneBin], ratio);
		
		if (ratio < amplitudeDropOffLimit) {
			break;
		}
		
		boundary++;
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
	 * As determined by the paper
	 */
	var secondaryPeakThreshold = 0.015;

	var boundary = 1;
	
	var found = false;

	while (true) {
		
		if (direction == -1 && (prevBoundary - boundary) < 0) {
			break;
		} else if (direction == 1 && (prevBoundary + boundary) >= analyser.frequencyBinCount) {
			break;
		}

		var idx = 0;

		
		idx = prevBoundary + boundary * direction;
		

		var ratio = audioData[idx] / audioData[primaryToneBin];
		
		//console.log(idx, audioData[idx], audioData[primaryToneBin], ratio);
		
		if (ratio >= secondaryPeakThreshold) {
			found = true;
			break;
		}

		boundary++;
	}

	if (found) {
		return findPeakLimits(audioData, direction, mapIndexToFreq(primaryToneBin + boundary * direction));
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
	console.log("Pilot Left: ");
	
	var leftBoundary = findPeakLimits(audioData, -1, oscillator.frequency.value);
	
	console.log("Pilot Right: ");
	
	var rightBoundary = findPeakLimits(audioData, 1, oscillator.frequency.value); 
	
	console.log("Bound: ", leftBoundary + ":" + rightBoundary);

	/*
	 * Do a scan for the second peak beyond of the pilot tone peak
	 * and if a peak with atleast 30% of the amplitude of the pilot tone is
	 * found, find its limits and change boundaries found earlier
	 *
	 * Do this scan only if there was a pilot tone peak in the first place
	 */	
	if (leftBoundary != 0) {
		console.log("Secondary Left: ");
		var secondaryLeftBoundary = checkForSecondaryPeak(audioData, -1, leftBoundary);
		
		if (secondaryLeftBoundary != -1) {
			leftBoundary = secondaryLeftBoundary;
		}
	}
	
	if (rightBoundary != 0) {
		console.log("Secondary Right: ");
		var secondaryRightBoundary = checkForSecondaryPeak(audioData, 1, rightBoundary);
		
		if (secondaryRightBoundary != -1) {
			rightBoundary = secondaryRightBoundary;
		}
	}

	repeat = setTimeout(processAudioData, 1);

	console.log("Final: left: ", leftBoundary, "Right: ", rightBoundary);

	return {"left" : leftBoundary, "right" : rightBoundary};
}

/*
 * Scan all frequencies from 18KHz to 22KHz to find the optimal
 * frequency for use by application
 *
 * Peak at the optimal frequency will be bigger than the next highest peak by atleast 3dB
 */ 
function findOptimalFrequency() {
	var start = 18000;
	var end = 22000;
	var maxAmplitude = -1, optimalFrequency = 0;
	
	var audioData = new Uint8Array(analyser.frequencyBinCount);

	for (var freq = start; freq <= end; freq++) {
		oscillator.frequency.value = freq;

		analyser.getByteFrequencyData(audioData);

		idx = mapFreqToIndex(freq);
	
		//console.log(freq, audioData[idx]);

		if (audioData[idx] > maxAmplitude) {
			maxAmplitude = audioData[idx];
			optimalFrequency = oscillator.frequency.value;
		}

	}
	console.log("Optimal Freq: " + optimalFrequency);

	oscillator.frequency.value = optimalFrequency;
}

function startSoundWave(isFirstTime) {
	console.log("Freq");

	oscillator.connect(audioContext.destination);

	if (isFirstTime) {
		findOptimalFrequency();
	}
	
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
		
		startSoundWave(true);
	}, function() { alert("Please allow Microphone Access")});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	console.log("Message Received");

	if (request.message == "init") {
		console.log("Init & Start");
		initSoundWave();
	} else if (request.message == "start") {
		console.log("Start");
		startSoundWave(false);
	} else if (request.message == "stop") {
		console.log("Stop");
		stopSoundWave();
	}
});

console.log("End");
