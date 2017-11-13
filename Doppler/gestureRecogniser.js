var direction = 0, prevDirection = 0, noDirChanges = 0, diff;
var readWindowSize = 4, currReadBins = readWindowSize;
var coolDownWindow = 10, currCoolDownWindow = coolDownWindow;
var start = true;

function reset() {
    currReadBins = readWindowSize;
    currCoolDownWindow = coolDownWindow;
    prevDirection = 0;
    noDirChanges = 0;
}

function gestureHandler(args) {
    if (start) {
        currCoolDownWindow += 10;
        start = false;
    }

    if (currCoolDownWindow > 0) {
        currCoolDownWindow -= 1;
        return;
    }

    //console.log("Cooldown Done!")
    diff = args.left - args.right;
    direction = Math.sign(diff);

    if (diff > 1 || diff < -1) {
        console.log(args.left, args.right, diff, args.peakAmp);
        console.log(direction);
        if (direction != prevDirection) {
            console.log("DIrection Changed")
            noDirChanges += 1;
            prevDirection = direction;
            currReadBins = readWindowSize;
        }

        currReadBins -= 1;
        if (currReadBins == 0) {
            if (noDirChanges == 1) {
                console.log("prev dirr: ", prevDirection);
                /* Movement in a specific direction */
                if (prevDirection == -1) {
                    console.log("Right/Down Movement");
                }
                else if (prevDirection == 1) {
                    console.log("Left/Up Movement")
                }
            }
            else if (noDirChanges == 3) {
                /* Single Tap */
                console.log("Single Tap");
            }
            else {
                /* Double Tap */
                console.log("Double Tap");
            }
            reset();
        }
    }
    
}