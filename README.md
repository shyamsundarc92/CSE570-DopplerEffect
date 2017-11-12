# CSE570-DopplerEffect

WordReplacer - Sample Chrome Extension developed for fun

# ToDO tasks in Doppler Effect

1) Debug Secondary Scan

2) Verify various params (Tuning Constant, thresholds for boundaries etc.) and verify robustness of change in cases when there is movement against cases where there is no movement

3) Once satisfied with the amount of detected change, start mapping gestures to bin movement

4) One click all tabs enable

------------

Tests run so far:

Threshold = 0.005

CASE 1 (Sriram's implementation) Freq 20000 Time 10:

Hand movement Up (For volume increase and scroll up) Hand Movement Down (For volume decrease and scroll down) ONLY WRIST:

Positive Difference between bin boundaries

Slow:
Diff is < 10  and Amplitude of peak is > 110


Fast:
Diff is > 10 but Amplitude of peak is same above

Hand Movement Left (For side scroll and rewind) & Hand Movement Right (For side scroll and fast forward) FULL HAND MOVEMENT

Slow:

Diff is < 10 and Amplitude of peak is < 110

Fast:
Diff is > 10 but AMplitude of peak is same as above


CASE 2 (Shyam's implementation) at 20000:

Hand movement Up (For volume increase and scroll up) Hand Movement Down (For volume decrease and scroll down) ONLY WRIST:

Positive Difference between bin boundaries

Slow:
Diff is < 10  and Amplitude of peak is < 75


Fast:
Diff is > 10 but Amplitude of peak is same above

Hand Movement Left (For side scroll and rewind) & Hand Movement Right (For side scroll and fast forward) FULL HAND MOVEMENT

Slow:

Diff is < 10 and Amplitude of peak is > 75

Fast:
Diff is > 10 but AMplitude of peak is same as above
