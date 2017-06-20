import cv2          # OpenCV Library
import os           # Needed for path and other cool stuff.
import subprocess   # Needed for subprocess call for FFMPEG
import sys          # used for passing arguments from node.js
import time         # used for calculating process time of each frame.

# declare base folder locations for files
baseCascadePath = 'cascades/'
baseImageLocation = 'images/'
baseVideoLocation = 'vids/'

# declare global video, output video, and image file variables for use
# file Variable
faceCascadeFilePath = baseCascadePath + 'haarcascade_frontalface_alt.xml'
faceCascade, myVidFile, imgFile, myOutputVideoFile = '', '', '', ''

#image for mask variable
origMaskHeight, origMaskWidth, imgMyMask, orig_mask, orig_mask_inv = '', '', '', '', ''

# default out variables for output file (not used except fourcc but set so they can be)
outVideoFOURCC = cv2.VideoWriter_fourcc(*'XVID')
outVideoWidth = 1280
outVideoHeight = 720
outVideoFPS = 30

# function for getting arguments from Node.js for processing and assign to global variables
def getArgs():
    global myVidFile
    global imgFile
    global myOutputVideoFile

    print 'Number of arguments:', len(sys.argv), 'arguments.'
    print 'Argument List:', str(sys.argv)

    if len(sys.argv) > 1:
            myVidFile = baseVideoLocation + str(sys.argv[1])
            imgFile = baseImageLocation + str(sys.argv[2])
            baseFileName = os.path.basename(myVidFile)
            orgFileName = os.path.splitext(baseFileName)[0]
            baseImageName = os.path.basename(imgFile)
            orgImageName = os.path.splitext(baseImageName)[0]
            myOutputVideoFile = baseVideoLocation + orgFileName + '_' + orgImageName +'.avi'
    else:
            print 'No arguments sent.  Using test variable values.'
            myVidFile = baseVideoLocation + 'test.mp4'
            imgFile = baseImageLocation + 'white_mask.png'
            myOutputVideoFile = baseVideoLocation + 'result.avi'
            print 'Defaults - Source: {}, Image: {}, Output: {}'.format(myVidFile, imgFile, myOutputVideoFile)

     # check if file(s) exists
    doFilesExist(faceCascadeFilePath, 'check')
    doFilesExist(imgFile, 'check')
    doFilesExist(myVidFile, 'check')
    # test if working file already exists (maybe faulty process or something) and delete
    doFilesExist(myOutputVideoFile, 'delete')

    return myVidFile, imgFile, myOutputVideoFile

# check for files and execute actions based on that.  Verification or delete
def doFilesExist(myFileLocation, myAction):
    if myAction == 'check':
        # check if file exists or not.  stop app if it doesn't
        if not os.path.isfile(myFileLocation):
            print 'Checking - ' + str(myFileLocation) + ' does not exist.  Exiting due to our fail...'
            exit(1)
        else:
            print 'Checking - ' + str(myFileLocation) + ' exists.  Keep rollin, rollin, rollin!'

    elif myAction == 'delete':
        # check to see if file exists and delete
        if os.path.isfile(myFileLocation):
            # remove current modified file
            print 'Checking - ' + str(myFileLocation) + ' already exists.  Deleting!'
            os.remove(myFileLocation)
        else:
            print 'Checking - ' + str(myFileLocation) + ' does not exist.  Good to go.'

# open all files and do calcuations
def openFiles(myAction):
    try:
        if myAction == 'cascade':
            global faceCascade
            # build cv2 Cascade Classifiers
            faceCascade = cv2.CascadeClassifier(faceCascadeFilePath)

            print 'All cascade variables assigned and returning to global variables. '
            return faceCascade

        elif myAction == 'image':
            global imgMyMask, orig_mask, orig_mask_inv, origMaskHeight, origMaskWidth

            # Load and configure image for overlay
            imgMyMask = cv2.imread(imgFile, -1)

            # Create the mask for the image
            orig_mask = imgMyMask[:, :, 3]

            # Create the inverted mask for the image
            orig_mask_inv = cv2.bitwise_not(orig_mask)

            # Convert image to BGR
            # and save the original image size
            imgMyMask = imgMyMask[:, :, 0:3]
            origMaskHeight, origMaskWidth = imgMyMask.shape[:2]

            print 'All image variables assigned and returning to global variables. '
            return imgMyMask, orig_mask, orig_mask_inv, origMaskHeight, origMaskWidth


    except Exception, e:
            print 'Error: ' + repr(e)
            exit(1)


def processVideo():


    # open video capture of source video for processing
    cap = cv2.VideoCapture(myVidFile)

    ''' used for calculating FPS time to process for troubleshooting
    start = time.time()
    counter = 0
    '''

    # get properties of video (width/height/FPS)
    myVidFPS = cap.get(cv2.CAP_PROP_FPS)  # float
    myVidWidth = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    myVidHeight = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    myVidFOURCC = cap.get(cv2.CAP_PROP_FOURCC)
    myFrameCount = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    myVideoLength = myFrameCount / myVidFPS
    myVidFileSize = float(os.path.getsize(myVidFile) / 1024)
    print 'File size: ' + str(int(myVidFileSize)) + ' KB.'

    # open a write file to save modified video frames
    # use default FOURCC (xVID/AVI) instead of source video since h264 codec won't load correctly in dev environment.
    out = cv2.VideoWriter(myOutputVideoFile, outVideoFOURCC, int(myVidFPS), (int(myVidWidth), int(myVidHeight)))

    # loop the source video and modify
    while cap.isOpened():

        # used for counting frames and calculating time to process FPS for troubleshooting.
        # counter += 1

        # Read frame by frame the video feed
        ret, frame = cap.read()

        '''  used for testing FPS processing for troubleshooting.  Prints time to process set FPS by video.
        if counter %int(myVidFPS) == 0:
            print 'Time to execute FPS(' + str(int(myVidFPS)) + '): ' + str(time.time() - start)
            start = time.time()
        '''
        if ret:
            # Create gray scale image from the video feed and set color ROI for final apply of edit.
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            roi_Frame_color = frame

            # Detect faces in input video stream.  scale factor, minNieghbors, minsize might need to be adjusted
            # for better capture depending on video
            faces = faceCascade.detectMultiScale(gray, scaleFactor=1.35, minNeighbors=4, minSize=(20, 20))

            # Iterate over each face found
            for (x, y, w, h) in faces:
                # Un-comment the next line for debug (draw box around all faces)
                # cv2.rectangle(frame,(x,y),(x+w,y+h),(255,0,0),2)

                # The mask should no bigger the width of face.  Set original width and height of image as default.  changed later in resize
                myMaskWidth = origMaskWidth
                myMaskHeight = origMaskHeight

                # set x and y for Region of Interest (ROI) of source material (video frame)
                x1 = x
                x2 = x + w
                y1 = y
                y2 = y + h

                # set width and height of mask image to width and height of face detected
                myMaskWidth = w
                myMaskHeight = h

                # resize image to size of ROI and create mask and inverse mask for merging of images
                imgResizedMask = cv2.resize(imgMyMask, (myMaskWidth, myMaskHeight), interpolation=cv2.INTER_AREA)
                mask = cv2.resize(orig_mask, (myMaskWidth, myMaskHeight), interpolation=cv2.INTER_AREA)
                mask_inv = cv2.resize(orig_mask_inv, (myMaskWidth, myMaskHeight), interpolation=cv2.INTER_AREA)

                # declare ROI of frame
                roi = roi_Frame_color[y1:y2, x1:x2]
                # print values for testing
                # print 'ROI size: '
                # print roi.size
                # print 'imgResized size: '
                # print imgResizedMask.size

                # mask inverse placed in ROI of frame
                roi_bg = cv2.bitwise_and(roi, roi, mask=mask_inv)
                # print values for testing
                # print roi_bg.size
                # print roi_bg.dtype
                # roi_height, roi_width, roi_depth = roi_bg.shape
                # print "info on roi"
                # print roi_height, roi_width, roi_depth

                # mask for image to be placed over face in frame
                roi_fg = cv2.bitwise_and(imgResizedMask, imgResizedMask, mask=mask)
                # print values for testing
                # print roi_fg.size
                # print roi_fg.dtype
                # roi_fg_height, roi_fg_width, roi_fg_depth = roi_fg.shape
                # print 'ROI_fg - Mask image:'
                # print roi_fg_height, roi_fg_width, roi_fg_depth

                # merge masks together.  Note: masks have to be the same size or OpenCV will roid rage on you.  :)
                dst = cv2.add(roi_bg, roi_fg)

                # add bilateral filter to make image not as choppy
                newDST = cv2.bilateralFilter(dst, 5, 50, 50)

                # apply the modified section in image back on to the frame.
                roi_Frame_color[y1:y2, x1:x2] = newDST
                # print 'applying mask to face.'


            # writing out frame to output file
            out.write(frame)

            # Display the resulting frame
            cv2.imshow('Video', frame)

            # press q key to exit.  commented out use for testing.
            # NOTE  x86 systems may need to remove:  0xFF == ord('q')
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print 'WARNING - User hit q key and terminated process.'
                break
        else:
            break

    # When everything is done, release the capture, and exit program
    # print 'processing done and closing all opened files.'
    cap.release()
    out.release()
    cv2.destroyAllWindows()


#function for calling FFMPEG to convert video from AVI to mp4.  Had issue installing DLL for h264
# so using FFMPEG for conversion.
def callFFmpeg(myFile):
    try:
        baseFileName = os.path.basename(myFile)
        orgFileName = os.path.splitext(baseFileName)[0] + '.mp4'
        newFileName = baseVideoLocation + orgFileName

        # call function to check if file exists and delete it
        doFilesExist(newFileName, 'delete')

        # call ffmpeg to convert to .mp4
        subprocess.call('ffmpeg -hide_banner -loglevel panic -i ' + str(myFile) + ' ' + str(newFileName), shell=True)
        # delete source AVI file
        os.remove(myFile)
        return orgFileName

    except Exception, e:
        print 'Error: ' + repr(e)
        exit(1)

# Call all functions to get process done: getArgs(), openFiles(), modifyVideo(), callFFMPEG()
# get pass arguments from Node.js and set global variables
getArgs()

print 'All arguments processed.   Opening all files/loading global variables for pre-processing for video.'
openFiles('cascade')
openFiles('image')
# don't need this anymore.  Do calcuations in processVideo function.
# openFiles('video')


print 'Processing video now!!!!!'
# start timer for video to check how long it takes to make it.
myTimer = time.time()

# Process selected video
processVideo()

# print 'Video created.  deleting AVI file and generating mp4 with FFMPEG.'
# run ffmpeg to convert to mp4
print 'Video processed.  Sending to FFMPEG for conversion to mp4.'
myFinishedVideoName = callFFmpeg(myOutputVideoFile)

print "Time to process: " + str(round(((time.time() - myTimer) / 60), 2)) + " minutes."
print myFinishedVideoName
exit()