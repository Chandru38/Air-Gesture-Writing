# import cv2
# import numpy as np
# import time
# import os
# import handtrackingmodule as htm

# eraserThickness = 35
# brushThickness = 5

# folderPath = "header"
# mylist = os.listdir(folderPath)
# print(mylist)
# overlayList = []
# for imPath in mylist:
#     image = cv2.imread(f'{folderPath}/{imPath}')
#     overlayList.append(image)
# print(len(overlayList))
# header = overlayList[0]
# drawColor = (255, 0, 255)
# cap=cv2.VideoCapture(0)
# cap.set(3,1280)
# cap.set(4,720)

# detector = htm.HandDetector(detectionCon=0.85)
# xp, yp = 0, 0
# imgCanvas = np.zeros((720, 1280, 3), np.uint8)
# while True:
#     #1.Import image
#     success, img = cap.read()
#     img = cv2.flip(img,1)
    
#     #2.Fing Hand landmarks
#     img = detector.findHands(img)
#     lmlist, bbox= detector.findPosition(img, draw=False)

#     if len(lmlist)!=0:
#         # print(lmlist)

#         #tip of index and middle fingers
#         x1,y1 = lmlist[8][1:]
#         x2,y2 = lmlist[12][1:]

#         #3.Check which fingers are up
#         fingers = detector.fingersUp()
#         # print(fingers)

#         #4.If selection mode - Two fingers are up
#         if fingers[1] and fingers[2]:
#             xp, yp = 0, 0
#             print("selection Mode")
#             #checking for the click
#             if y1<125:
#                 if 250 < x1 < 450:
#                     header = overlayList[0]
#                     drawColor = (0,0,255)
#                 elif 550 < x1 < 750:
#                     header = overlayList[1]
#                     drawColor = (255,0,0)
#                 elif 800 < x1 < 950:
#                     header = overlayList[2]
#                     drawColor = (0,255,0)
#                 elif 1050 < x1 < 1200:
#                     header = overlayList[3]
#                     drawColor = (0,0,0)
#             cv2.rectangle(img,(x1,y1-30), (x2,y2+30), drawColor, cv2.FILLED)

#         #5.If we have the drawing mode - Index finger is up
#         if fingers[1] and fingers[2]==False:
#             cv2.circle(img,(x1,y1), 15, drawColor, cv2.FILLED)
#             print("Drawing Mode")
#             if xp == 0 and yp == 0:
#                 xp, yp = x1, y1

#             if drawColor ==(0,0,0):
#                 cv2.line(img, (xp, yp), (x1, y1), drawColor, eraserThickness)
#                 cv2.line(imgCanvas, (xp, yp), (x1, y1), drawColor, eraserThickness)
#             else:
#                 cv2.line(img, (xp, yp), (x1, y1), drawColor, brushThickness)
#                 cv2.line(imgCanvas, (xp, yp), (x1, y1), drawColor, brushThickness)

#             xp, yp = x1, y1

#     imgGray = cv2.cvtColor(imgCanvas, cv2.COLOR_BGR2GRAY)
#     _, imgInv = cv2.threshold(imgGray, 50, 255, cv2.THRESH_BINARY_INV)
#     imgInv = cv2.cvtColor(imgInv, cv2.COLOR_GRAY2BGR)
#     img = cv2.bitwise_and(img, imgInv)
#     img = cv2.bitwise_or(img, imgCanvas)

         
#     #setting the header image
#     img[0:125, 0:1280] = header
#     img = cv2.addWeighted(img,0.5,imgCanvas,0.5, 0)
#     cv2.imshow("Image",img)
#     cv2.imshow("Canvas",imgCanvas)
#     cv2.imshow("Inv", imgInv)
#     cv2.waitKey(1)

import cv2
import numpy as np
import os
import handtrackingmodule as htm

# ── Settings ──────────────────────────────────────────────
eraserThickness = 35
brushThickness   = 3     # slightly thicker = smoother cursive look

# ── Load header images ────────────────────────────────────
folderPath = "header"
mylist     = os.listdir(folderPath)
overlayList = []
for imPath in mylist:
    image = cv2.imread(f'{folderPath}/{imPath}')
    image = cv2.resize(image, (1280, 125))   # make sure every header fits
    overlayList.append(image)

header    = overlayList[0]
drawColor = (0, 0, 255)   # default red

# ── Camera ────────────────────────────────────────────────
cap = cv2.VideoCapture(0)
cap.set(3, 1280)
cap.set(4, 720)

# ── Hand detector ─────────────────────────────────────────
detector  = htm.HandDetector(detectionCon=0.85)
xp, yp    = 0, 0
imgCanvas = np.zeros((720, 1280, 3), np.uint8)

while True:
    # 1. Capture frame
    success, img = cap.read()
    if not success:
        break
    img = cv2.flip(img, 1)

    # 2. Find hand landmarks
    img     = detector.findHands(img)
    lmlist, bbox = detector.findPosition(img, draw=False)

    if len(lmlist) != 0:
        # Fingertip positions
        x1, y1 = lmlist[8][1],  lmlist[8][2]   # index tip
        x2, y2 = lmlist[12][1], lmlist[12][2]  # middle tip

        # 3. Which fingers are up
        fingers = detector.fingersUp()

        # ── SELECTION MODE (index + middle up) ────────────
        if fingers[1] == 1 and fingers[2] == 1:
            xp, yp = 0, 0   # reset so next stroke starts fresh

            if y1 < 125:
                if 250 < x1 < 450:
                    header    = overlayList[0]
                    drawColor = (0, 0, 255)       # Red
                elif 550 < x1 < 750:
                    header    = overlayList[1]
                    drawColor = (255, 0, 0)       # Blue
                elif 800 < x1 < 950:
                    header    = overlayList[2]
                    drawColor = (0, 255, 0)       # Green
                elif 1050 < x1 < 1200:
                    header    = overlayList[3]
                    drawColor = (0, 0, 0)         # Eraser

            # Show selection cursor
            cv2.rectangle(img, (x1, y1 - 25), (x2, y2 + 25), drawColor, cv2.FILLED)

        # ── DRAWING MODE (index finger only) ──────────────
        if fingers[1] == 1 and fingers[2] == 0:
            cv2.circle(img, (x1, y1), brushThickness, drawColor, cv2.FILLED)

            if xp == 0 and yp == 0:
                xp, yp = x1, y1   # start point

            thickness = eraserThickness if drawColor == (0, 0, 0) else brushThickness

            # Draw on canvas (persistent layer)
            cv2.line(imgCanvas, (xp, yp), (x1, y1), drawColor, thickness)

            xp, yp = x1, y1

        # Reset prev point when no drawing finger is up
        if fingers[1] == 0:
            xp, yp = 0, 0

    # ── Merge canvas onto camera feed (single window) ─────
    imgGray        = cv2.cvtColor(imgCanvas, cv2.COLOR_BGR2GRAY)
    _, imgInv      = cv2.threshold(imgGray, 10, 255, cv2.THRESH_BINARY_INV)
    imgInv         = cv2.cvtColor(imgInv, cv2.COLOR_GRAY2BGR)
    img            = cv2.bitwise_and(img, imgInv)   # cut canvas shape from cam
    img            = cv2.bitwise_or(img, imgCanvas) # paste canvas onto cam

    # ── Overlay header ────────────────────────────────────
    img[0:125, 0:1280] = header

    # ── Single output window ──────────────────────────────
    cv2.imshow("Air Writing", img)

    # Press Q to quit | Press C to clear canvas
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('c'):
        imgCanvas = np.zeros((720, 1280, 3), np.uint8)

cap.release()
cv2.destroyAllWindows()