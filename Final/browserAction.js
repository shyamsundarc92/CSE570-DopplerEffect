function movementVertical(args, type, fullScreenElement) {

	if (fullScreenElement == undefined) {
		var speed = Math.abs(avgDiff) * 100;

		if (type == "Up") {
			speed *= -1;
		}

		window.scrollBy(0, speed);
	
	} else {
		var increase = Math.abs(avgDiff) / 20.0;

		if (type == "Down") {
			increase *= -1;
		}

		fullScreenElement.volume += increase;
	}
}

function movementHorizontal(args, type, fullScreenElement) {
	if (fullScreenElement == undefined) {
		/*
		 * For now, nothing. Will add algorithm to detect multple gestures of the
		 * same type and trigger some action as a result
		 */
	} else {
		var speed = Maths.abs(avgDiff) * 5;

		if (type == "Left") {
			speed *= -1;
		}

		fullScreenElement.currentTime += speed;
	}
}

function movementTap(args, type, fullScreenElement) {
	console.log("Tapped", fullScreenElement);

	if (fullScreenElement != undefined) {
		
		var media = document.getElementsByTagName('video');

		console.log(media);

		var isPaused = media.paused;
		/*
		if (isPaused) {
			fullScreenElement.play();
		} else {
			fullScreenElement.pause();
		}*/
		console.log("IsPaused = ", isPaused);
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
