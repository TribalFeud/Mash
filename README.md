Mash

Search for videos, download, and modify video with image overlay.

Software Environment -

Node.js 7.10.0 (https://nodejs.org/en/download/)

FFMPEG N-86310-g220b24c (https://www.ffmpeg.org/download.html)
-- Note(s) -- 
make sure to add to path global variable in OS to the ffmpeg folder so you can execute globally.

Python 2.7 (https://www.python.org/downloads/)
-- Note --  
Be sure to follow python installation instructions to add to the path global variable in OS to the python folder and scripts folder so you can execute globally.

MongoDB 3.4.4 (https://www.mongodb.com/download-center)

OpenCV 3.2.0 (http://opencv.org/releases.html)
-- Note(s) --
Grab cv2.pyd from openCV folder: (*path to opencv*\build\python\2.7).  Must choose the bit version your OS/python installation either x86(32-bit) or x64(64-bit).
Copy file: cv2.pyd into python folder (*path to python folder*\Lib\site-packages) 

Grab the FFMPEG dll for python to read/write mp3/other videos: (*path to opencv*\build\bin).  Must choose the bit version of your OS/python installation
File(s):
opencv_ffmpeg320.dll x86(32-bit) or opencv_ffmpeg320_64.dll x64(64-bit)
Copy file: the dll to main folder of python installation (default installation location would be c:\python27) in order for Python to open .mp4 files when using OpenCV.


-- Other Note(s) --
Application developed on windows OS.  
OpenCV currently does not support python 3.x according to when this was developed.
Please follow any 3rd party software instruction for setting up environment.
