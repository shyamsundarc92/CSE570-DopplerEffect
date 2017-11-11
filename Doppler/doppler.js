
var audioContext, oscillator, analyser, repeat = 0;
//window.addEventListener('load', init, false);

function convertFreqToIndex(frequency) {
    return Math.round((frequency/audioContext.sampleRate) * (analyser.fftSize));
}

function convertIndexToFreq(idx) {
    return Math.round((audioContext.sampleRate/analyser.fftSize) * idx);
}

function init() {
    try {
        //console.log("In init");
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
    //oscillator.stop();
    oscillator.disconnect(audioContext.destination);
    clearInterval(repeat);
}
function startMicrophone() {
    //console.log("In startMicrophone");
    navigator.getUserMedia({ audio: { optional: [{ echoCancellation: false }] } }, function(streamSource) {
        var mic = audioContext.createMediaStreamSource(streamSource);
        mic.connect(analyser);
        emitSound();
    }, function() { alert('Please allow access to the microphone') });
}

function emitSound() {
    try {
        //console.log('In emitSound');
        /* Initial Value */
        oscillator.frequency.value = 20000;
        oscillator.connect(audioContext.destination);
        oscillator.start();
        
        
        /* Calculating optimal frequency to emit sound */
        oscillator.frequency.value = getOptimalFrequency();
        console.log(oscillator.frequency.value);

        analyseInputData();
    }
    catch(e) {
        alert('Unable to emit sound');
    }
}

function getLeftBandwidth(audioData) {
    try {
        //console.log("In getLeftBandwidth");
        var frequencyBins = 33, left = 0;
        //console.log("ana: ", oscillator.frequency.value);
        var primaryToneBin = convertFreqToIndex(oscillator.frequency.value);
        console.log("Prim: ", primaryToneBin);
        minCutOffRatio = 0.5;
        var binNo = 0;
        while (binNo < frequencyBins && primaryToneBin - binNo >= 0) {
            var ratio = audioData[primaryToneBin - binNo] / audioData[primaryToneBin];
            if (ratio < minCutOffRatio) {
                left = primaryToneBin - binNo;
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
        //console.log("In getRightBandwidth");
        var frequencyBins = 33, right = 0;
        var primaryToneBin = convertFreqToIndex(oscillator.frequency.value);
        minCutOffRatio = 0.10;
        var binNo = 1;
        while (binNo <= frequencyBins && primaryToneBin + binNo < analyser.frequencyBinCount) {
            var ratio = audioData[primaryToneBin + binNo] / audioData[primaryToneBin];
            if (ratio < minCutOffRatio) {
                right = primaryToneBin + binNo;
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

function analyseInputData() {
    console.log("In analyseInputData");
    var audioData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(audioData);

    if (audioData[convertFreqToIndex(oscillator.frequency.value)] == 0) {
        console.log("No change");
        setTimeout(analyseInputData, 1);
    }
    else {
        var left = getLeftBandwidth(audioData);
        var right = getRightBandwidth(audioData);
        console.log(left, " : ", right);

        repeat = setTimeout(analyseInputData, 1);
        return {"left" : left, "right" : right};
    }
}

function getOptimalFrequency() {
    console.log("In getOptimalFrequency");
    var startFreq = 18000, endFreq = 22000;
    /* frequencyBinCount is half the FFT size */
    var audioData = new Uint8Array(analyser.frequencyBinCount);
    var max = 0;

    startIndex = convertFreqToIndex(startFreq);
    endIndex = convertFreqToIndex(endFreq);

    //console.log(startIndex, endIndex);
    //console.log(convertIndexToFreq(startIndex));
    for(var i = startIndex; i < endIndex; i++) {
        oscillator.frequency.value = convertIndexToFreq(i);
        analyser.getByteFrequencyData(audioData);
        //console.log(i, max);
        //console.log(audioData[i]);
        if (audioData[i] > max) {
            max = audioData[i];
            index = i;
        }
    }
    return max != 0 ? convertIndexToFreq(index) : 20000;
}


