function movementVertical(args, type, fullScreenElement) {

	if (fullScreenElement == undefined) {
		var speed = Math.abs(avgDiff) * 100;

		if (type == "Up") {
			speed *= -1;
		}

		window.scrollBy(0, speed);
	
	} else {
		var media = fullScreenElement.getElementsByTagName('video')[0];
		
		var increase = Math.abs(avgDiff) / 20.0;

		if (type == "Down") {
			increase *= -1;
		}

		media.volume += increase;
	}
}

function movementHorizontal(args, type, fullScreenElement) {
	if (fullScreenElement == undefined) {
		/*
		 * For now, nothing. Will add algorithm to detect multple gestures of the
		 * same type and trigger some action as a result
		 */
	} else {
		var media = fullScreenElement.getElementsByTagName('video')[0];
		
		var speed = Maths.abs(avgDiff) * 5;

		if (type == "Left") {
			speed *= -1;
		}

		media.currentTime += speed;
	}
}

function movementTap(args, type, fullScreenElement) {

	if (fullScreenElement != undefined) {
		
		var media = fullScreenElement.getElementsByTagName('video')[0];

		console.log(media);

		var isPaused = media.paused;
		
		if (isPaused) {
			media.play();
		} else {
			media.pause();
		}
	}
}

function checkFullScreen(args, type, callback) {

	var fullScreenElement = (document.fullscreenElement || document.webkitFullscreenElement);

	callback(args, type, fullScreenElement);
}

chrome.runtime.onMessage.addListener(function (request, sender) {
	if (request.message == "Up" || request.message == "Down" ||
		request.message == "Left" || request.message == "Right" ||
		request.message == "Tap") {
		var callback = undefined;

		if (request.message == "Up" || request.message == "Down") {
			callback = movementVertical;
		} else if (request.message == "Left" || request.message == "Right") {
			callback = movementHorizontal;
		} else if (request.message == "Tap") {
			callback = movementTap;
		}
		
		checkFullScreen(request.args, request.message, callback);
	}
});
