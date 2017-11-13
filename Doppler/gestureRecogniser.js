var direction = 0, prevDirection = 0, noDirChanges = 0, diff;
var readWindowSize = 10, currReadBins = readWindowSize;
var coolDownWindow = 8, currCoolDownWindow = coolDownWindow;
var start = true;
var totAmp = 0, totDiff = 0;

function reset() {
    currReadBins = readWindowSize;
    currCoolDownWindow = coolDownWindow;
    prevDirection = 0;
    noDirChanges = 0;
}

function gestureHandler(args) {
    if (start) {
        currCoolDownWindow += 20;
        start = false;
    }

    if (currCoolDownWindow > 0) {
        currCoolDownWindow -= 1;
        return;
    }

    //console.log("Cooldown Done!")
    diff = args.left - args.right;
    direction = Math.sign(diff);

    if (diff > 2 || diff < -2) {
        totAmp += args.peakAmp;
        totDiff += diff;
        //console.log(args.left, args.right, diff, args.peakAmp);
        //console.log(direction);


        if (direction != prevDirection) {
            //console.log("DIrection Changed")
            noDirChanges += 1;
            prevDirection = direction;
            currReadBins = readWindowSize;
            totAmp = 0;
            totDiff = 0;
        }

        currReadBins -= 1;
        if (currReadBins == 0) {
            var avgDiff = totDiff / readWindowSize;
            var avgAmp = totAmp / readWindowSize;
            console.log("dir: ", noDirChanges, "diff: ", avgDiff, "amp: ", avgAmp);
            if ((noDirChanges == 2 && avgDiff >= -3 && avgDiff <= 3) || noDirChanges > 2) {
                /* Double Tap */
                console.log("Tap");
            } else if (noDirChanges <= 2) {
                //console.log("prev dirr: ", prevDirection);
                /* Movement in a specific direction */
                if (prevDirection == -1) {
                    console.log("Right/Down Movement");
                }
                else if (prevDirection == 1) {
                    console.log("Left/Up Movement")
                }
            }
            /*else if (noDirChanges >= 2 && noDirChanges <= 3) {
                /* Single Tap 
                console.log("Single Tap");
             }*/
            
            reset();
        }
    }
    
}