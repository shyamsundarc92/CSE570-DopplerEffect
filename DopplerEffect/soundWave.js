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
	var amplitudeDropOffLimit = 0.1;

	var boundary = 1;
	
	while (boundary <= frequencyBinLimit) {
		if (direction == -1 && (peakToneBin - boundary) < 0) {
			boundary = 0;
			break;
		} else if (direction == 1 && (peakToneBin + boundary) >= analyser.frequencyBinCount) {
			boundary = analyser.frequencyBinCount - 1;
			break;
		}

		var idx = 0;

		if (boundary == -1) {
			idx = peakToneBin - boundary;
		} else {
			idx = peakToneBin + boundary;
		}

		var ratio = audioData[idx] / audioData[peakToneBin];

		if (ratio < amplitudeDropOffLimit) {
			break;
		}
		
		boundary++;
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
	var secondaryPeakThreshold = 0.3;

	var boundary = 1;
	var found = false;

	while (true) {
		
		if (direction == -1 && (prevBoundary - boundary) < 0) {
			break;
		} else if (direction == 1 && (prevBoundary + boundary) >= analyser.frequencyBinCount) {
			break;
		}

		var idx = 0;

		if (boundary == -1) {
			idx = prevBoundary - boundary;
		} else {
			idx = prevBoundary + boundary;
		}

		var ratio = audioData[idx] / audioData[primaryToneBin];

		if (ratio >= secondaryPeakThreshold) {
			found = true;
			break;
		}

		boundary++;
	}

	if (found) {
		return findPeakLimits(audioData, direction, mapIndexToFreq(boundary));
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
	var leftBoundary = findPeakLimits(audioData, -1, oscillator.frequency.value);
	
	var rightBoundary = findPeakLimits(audioData, 1, oscillator.frequency.value); 

	/*
	 * Do a scan for the second peak beyond of the pilot tone peak
	 * and if a peak with atleast 30% of the amplitude of the pilot tone is
	 * found, find its limits and change boundaries found earlier
	 */
	var secondaryLeftBoundary = checkForSecondaryPeak(audioData, -1, leftBoundary);

	var secondaryRightBoundary = checkForSecondaryPeak(audioData, 1, rightBoundary);

	console.log(leftBoundary + ":" + rightBoundary);

	console.log(secondaryLeftBoundary + ";" + secondaryRightBoundary);

	if (secondaryLeftBoundary != -1) {
		leftBoundary = secondaryLeftBoundary;
	}

	if (secondaryRightBoundary != -1) {
		rightBoundary = secondaryRightBoundary;
	}

	repeat = setTimeout(processAudioData, 1);

	return {"left" : leftBoundary, "right" : rightBoundary};
}

/*
 * Scan all frequencies from 18KHz to 22KHz to find the optimal
 * frequency for use by application
 *
 * Peak at the optimal frequency will be bigger than the next highe * peak by atleast 3dB
 */ 
function findOptimalFrequency() {
	var start = 18000;
	var end = 22000;
	var maxAmplitude = -1, optimalFrequency = 0;
	
	var audioData = new Uint8Array(analyser.frequencyBinCount);

	for (var i = start; i <= end; i++) {
		oscillator.frequency.value = i;

		analyser.getByteFrequencyData(audioData);

		idx = mapFreqToIndex(i);

		if (audioData[idx] > maxAmplitude) {
			maxAmplitude = audioData[idx];
			optimalFrequency = oscillator.frequency.value;
		}
	}

	console.log("Optimal Freq: " + optimalFrequency);

	oscillator.frequency.value = optimalFrequency;
}

function startSoundWave(findOptFreq) {	
	oscillator.connect(audioContext.destination);

	if (findOptFreq) {
		findOptimalFrequency();
	}

	processAudioData();
}

function stopSoundWave() {
	oscillator.disconnect(audioContext.destination);

	clearInterval(repeat);
}

function initSoundWave() {
	navigator.mediaDevices.getUserMedia({audio: { optional: [{ echoCancellation: false }] }, function(streamSource) {
		/*
		 * Create Microphone audio source and connect analyser to it
		 */
		var source = audioContext.createMediaStreamSource(streamSource);
		source.connect(analyser);
	}});

	startSoundWave(true);
}

chrome.runtime.onMessage.addListener(
	function(request, sender) {
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
