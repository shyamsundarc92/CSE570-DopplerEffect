
var audioContext, oscillator, analyser, repeat = 0;

function convertFreqToIndex(frequency) {
    return Math.round((frequency/audioContext.sampleRate) * (analyser.fftSize));
}

function convertIndexToFreq(idx) {
    return Math.round((audioContext.sampleRate/analyser.fftSize) * idx);
}

function init() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        oscillator = audioContext.createOscillator();
        analyser = audioContext.createAnalyser();
        startMicrophone();
    }
    catch(e) {
        alert('Web Audio API not supported in this browser');
    }
}

function end() {
    oscillator.disconnect(audioContext.destination);
    clearInterval(repeat);
}

function startMicrophone() {
    navigator.getUserMedia({ audio: { optional: [{ echoCancellation: false }] } }, function(streamSource) {
        var mic = audioContext.createMediaStreamSource(streamSource);
        mic.connect(analyser);
        emitSound();
    }, function() { alert('Please allow access to the microphone') });
}

function emitSound() {
    try {
        /* Initial Value */
        oscillator.frequency.value = 20000;
        oscillator.connect(audioContext.destination);
        oscillator.start();
        
        /* Calculating optimal frequency to emit sound */
        //oscillator.frequency.value = getOptimalFrequency();
        console.log(oscillator.frequency.value);

        analyseInputData();
    }
    catch(e) {
        alert('Unable to emit sound');
    }
}

function analyseInputData() {
    var audioData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(audioData);

    if (audioData[convertFreqToIndex(oscillator.frequency.value)] == 0) {
        setTimeout(analyseInputData, 10);
    }
    else {
        var left = getLeftBandwidth(audioData);
        var right = getRightBandwidth(audioData);
        
        //var diff = left - right;
            //console.log(left, " : ", right, "diff: ", left - right);

        repeat = setTimeout(analyseInputData, 50);
        gestureHandler({"left" : left, "right" : right, "peakAmp" : audioData[convertFreqToIndex(oscillator.frequency.value)]});
    }
}

function getLeftBandwidth(audioData) {
    try {
        var frequencyBins = 33, left = 0;
        var primaryToneBin = convertFreqToIndex(oscillator.frequency.value);
        minCutOffRatio = 0.005;
        var binNo = 1;
        while (binNo < frequencyBins && primaryToneBin - binNo >= 0) {
            var ratio = audioData[primaryToneBin - binNo] / audioData[primaryToneBin];
            if (ratio < minCutOffRatio) {
                left = binNo;
                break;
            }
            binNo += 1;
        }
    }
    catch(e) {
        console.log("Error in computing Left boundary for bandwidth: ", e);
    }

    return left;
}

function getRightBandwidth(audioData) {
    try {
        var frequencyBins = 33, right = analyseInputData.frequencyBinCount - 1;
        var primaryToneBin = convertFreqToIndex(oscillator.frequency.value);
        minCutOffRatio = 0.005;
        var binNo = 1;
        while (binNo <= frequencyBins && primaryToneBin + binNo < analyser.frequencyBinCount) {
            var ratio = audioData[primaryToneBin + binNo] / audioData[primaryToneBin];
            if (ratio < minCutOffRatio) {
                right = binNo;
                break;
            }
            binNo += 1;
        }
    }
    catch(e) {
        console.log("Error in computing Right boundary for bandwidth: ", e);
    }

    return right;
}

function getOptimalFrequency() {
    var startFreq = 18000, endFreq = 22000;
    /* frequencyBinCount is half the FFT size */
    var audioData = new Uint8Array(analyser.frequencyBinCount);
    var max = 0;

    startIndex = convertFreqToIndex(startFreq);
    endIndex = convertFreqToIndex(endFreq);

    for(var i = startIndex; i < endIndex; i++) {
        oscillator.frequency.value = convertIndexToFreq(i);
        analyser.getByteFrequencyData(audioData);
        if (audioData[i] > max) {
            max = audioData[i];
            index = i;
        }
    }
    return max != 0 ? convertIndexToFreq(index) : 20000;
}


