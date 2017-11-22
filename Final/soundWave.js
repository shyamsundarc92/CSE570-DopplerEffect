var audioContext, oscillator, analyser, repeat = 0, currentTabId = -1;

/*
 * Convert given Frequency to FFT Bin Index
 */
function convertFreqToIndex(freq) {
	return Math.round(freq * (analyser.fftSize / audioContext.sampleRate));
}

/*
 * Convert given FFT Bin Index to Frequency
 */
function convertIndexToFreq(idx) {
	return Math.round(idx * (audioContext.sampleRate / analyser.fftSize));
}

/*
 * Given a peak tone frequency, find the limit on requested side of the peak tone
 * -1 - Left Side Limit
 * 1  - Right Side Limit
 */
function findPeakLimits(audioData, direction, peakTone) {
	var peakToneBin = convertFreqToIndex(peakTone);
	/*
	 * As determined by the paper
	 */
	var frequencyBinLimit = 33;
	/*
	 * Determined by experimentation
	 */
	var amplitudeDropOffLimit = 0.005;

	var boundary = 0;

	while (++boundary <= frequencyBinLimit) {
		var idx = peakToneBin + boundary * direction;

		if ((direction == -1 && idx < 0) ||
			(direction == 1 && idx >= analyser.frequencyBinCount)) {
			break;
		}

		var ratio = audioData[idx] / audioData[peakToneBin];
		
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
 * Fetch and process data from the microphone
 */
function processAudioData() {
	var audioData = new Uint8Array(analyser.frequencyBinCount);

	analyser.getByteFrequencyData(audioData);
	
	var leftBoundary = 0, rightBoundary = 0;

	if (audioData[convertFreqToIndex(oscillator.frequency.value)] != 0) {
		/*
		 * Find the limits of the pilot tone peak
		 */
		leftBoundary = findPeakLimits(audioData, -1, oscillator.frequency.value);

		rightBoundary = findPeakLimits(audioData, 1, oscillator.frequency.value); 
	}
	
	repeat = setTimeout(processAudioData, 40);

	var args = {"left" : leftBoundary, "right" : rightBoundary,
		"peakAmp" : audioData[convertFreqToIndex(oscillator.frequency.value)]};

	chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "SampledResult", "args" : args});
}

function startSoundWave() {
	oscillator.connect(audioContext.destination);

	processAudioData();
}

function stopSoundWave() {
	if (oscillator != undefined) {
		oscillator.disconnect(audioContext.destination);
	}

	clearInterval(repeat);
}

function initAudioParams() {
	audioContext = new AudioContext();

	/*
	 * Create an oscillator and configure it for sound tranmission
	 */
	oscillator = audioContext.createOscillator();
	oscillator.frequency.value = 20000; // Optimal Frequency found via experimentation
	oscillator.start();

	/*
	 * Create Analyser for processing the audio data
	 */
	analyser = audioContext.createAnalyser();
}

function initSoundWave() {
	navigator.getMedia = (navigator.getUserMedia || navigator.webKitGetUserMedia);

	navigator.getMedia({audio: { optional: [{ echoCancellation: false }] } },
		function(streamSource) {
		
		initAudioParams();

		/*
		 * Create Microphone audio source and connect analyser to it
		 */
		var source = audioContext.createMediaStreamSource(streamSource);

		source.connect(analyser);
		
		startSoundWave();

	}, function() {
		alert("ERROR - Need Microphone access for extension to work");
		
		chrome.runtime.sendMessage({"tab" : currentTabId, "message" : "Error"});
	});
}

chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.message == "Init" || request.message == "Updated") {
		if (oscillator != undefined) {
			return;
		}

		console.log(request.message, " & Start");
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
