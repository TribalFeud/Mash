var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var ytdl = require('ytdl-core');
var google = require('googleapis');
var vidStreamer = require("vid-streamer");
var pythonShell = require('python-shell');
var mongoClient = require('mongodb').MongoClient;
var mongoURL = "mongodb://127.0.0.1:27017/Mash";

var authData = getAuthKey();
var graph = "";


var port = 8080;
var currentDatetime = Date();
var oneHourInMilliseconds = (1000 * 60) * 60;

//HTTP server initialization
var server = http.createServer(function (req, res) {

  res.setTimeout(oneHourInMilliseconds);
  //Manage requests and events on HTTP server
  dispatch(req, res);
  
}).listen(port);

//VidStreamer server initialization
var app = http.createServer(vidStreamer.settings(
  {
    rootFolder: __dirname + '/vids/',
    forceDownload: true,
    rootPath: ""
  }
));

app.listen(3000);

console.log('[' + Date() + '] Server started')

//primary function to call events/functions for application
function dispatch(req, res) {

  console.log('[' + Date() + '] Dispatching ' + req.url)

  var path = url.parse(req.url, true).pathname;

  switch (path) {

    //begin application with search html
    case "/":
      renderSearch(req, res);
      break;

    //execute javascript server side to load graph/table
    case "/graph":
      renderGraph(req, res);
      break;

    //get data, put into mongodb, redirect to dashboard.  :)
    case "/search":
      searchYouTube(req, res)
      break;

    //load dashboard html to get graph
    case "/dashboard":
      renderDashBoard(req, res);
      break;

    //download video
    case "/download":
      download(req, res);
      break;

    //modify video
    case "/mash":
      mash(req, res);
      break;
    //remove video record form mongodb and physical files if any.
    case "/remove":
      remove(req, res);
      break;
    //default handle
    default:
      handleDefault(req, res);
      break;

  }

}

//Search YouTUbe from criteria, insert into MongoDB, and dispatch to dashboard.
function searchYouTube(req, res) {
  console.log("Searching for videos.")
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  //console.log('query: ' + query.q + ' count: ' + query.r);
  var youtubeV3 = google.youtube({ version: 'v3', auth: "" + authData + "" });
  var params = { "part": 'snippet', "type": "video", "q": query.q, "maxResults": query.r, "order": "viewcount", "safeSearch": 'moderate' };
  var currentDatetime = Date();

  var request = youtubeV3.search.list(params, function (err, response) {
    
    //console.log(response); console.log('Here we start search');
    if (err) {
      console.log(err);

    }
    else {

      //items.id and items.snippet usual keys for items run response.items[0] to get top level node/keys
      //console.log(Object.keys(response.items[0]));
      if (response.items == null) {
        console.log('No videos found!!!!');
      }
      else {

        for (var i in response.items) {
          var item = response.items[i];
          var node = "";
          if (!node) {

            node = {
              "vidid": item.id.videoId,
              "title": item.snippet.title,
              "description": item.snippet.description,
              "creatorId": item.snippet.channelId,
              "creatorName": item.snippet.channelTitle,
              "thumbnail": item.snippet.thumbnails.default.url,
              "url": 'http://youtu.be/' + item.id.videoId,
              "download": '',
              "mash": '',
              "created": Date()
            };
          }

          node.updated = currentDatetime;
          mongodbUpdate(node, 'add');
        }
        //write out html.
        console.log("Search complete.\nUpdate to video collection complete.")
        console.log("Rendering Dashboard.")
        redirect(req, res, "./dashboard")
      }
    }
  });
}

//Default response for anyhting not handled by dispatch
function handleDefault(req, res) {

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.write(req.url + ' Not Found');
  res.end();

}

//Redirect response to proper html page
function redirect(req, res, url) {

  console.log('[' + Date() + '] Redirecting <' + req.url + '> to <' + url + '>');

  res.writeHead(302, { 'Location': url });

  res.end();

}

//Renders dashboard from html template in HTML folder
function renderDashBoard(req, res) {

  console.log('[' + Date() + '] Rendering - Dashboard');
  var filePath = path.join(__dirname, 'html/dashboard.html');
  var stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': stat.size
  });
  var readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
}

//Sends graph (data array) to dashboard into the javascript function to generate table.
function renderGraph(req, res) {

  console.log('[' + Date() + '] renderGraph');
  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;
    var myCollection = db.collection("Videos");
    myCollection.find({}).toArray(function (err, result) {
      if (err) {
        console.log("Error getting videos: " + err);
        throw err;
      }
      else {
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.write('callback (' + JSON.stringify(result) + ')');
        res.end();
        console.log("Video rendered to dashboard: " + result.length);
      }

    });
    db.close();
  });


}

//Downloads video from ID from YouTube and updates mongodb collection for that video
function download(req, res) {

  console.log('[' + Date() + '] Downloading ');

  var query = url.parse(req.url, true).query;
  var id = query.id;
  var fileName = id + '.mp4';
  var filePath = path.join(__dirname, '/vids/', fileName);

  var node = {};
  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;
    var query = { "vidid": id };
    db.collection("Videos").find(query).toArray(function (err, result) {
      if (err) throw err;
      //console.log(result);
      if (result.length <= 0) {
        console.log("No video found with this vidid:" + id)
      } else {
        console.log("Video found in DB.");
        node = JSON.parse(JSON.stringify(result[result.length - 1]));

        var fileStream = fs.createWriteStream(filePath);
        ytdl(node.url,
          { filter: function (format) { return format.container === 'mp4'; } })
          .pipe(fileStream);

        fileStream.on('finish', function () {

          node.download = "http://127.0.0.1:3000/" + fileName;
          //node.download = "http://ec2-34-210-6-0.us-west-2.compute.amazonaws.com:3000/" + fileName;

          console.log('[' + Date() + '] Saved ' + filePath);
          mongodbUpdate(node, 'update');
        });

        fileStream.on('error', function (error) {

          console.log('[' + Date() + '] Download error ' + error);

          node.download = "Failed";
          mongodbUpdate(node, 'update');

        });

        node.download = "Running";
        mongodbUpdate(node, 'update');
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write("Downloading " + node.url + ' to ' + filePath);
        res.end();
      }
    });
    db.close();
  });
}

//Opens video source downloaded, calls python using OpenCV, generates modified file, saves, and updates DB.
function mash(req, res) {

  console.log("Starting video modification");
  var query = url.parse(req.url, true).query;
  var id = query.id;

  var imgFileName = query.maskType;
  var fileName = id + '.mp4';

  var node = {};
  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;
    var query = { "vidid": id };
    db.collection("Videos").find(query).toArray(function (err, result) {
      if (err) throw err;
      //console.log(result);
      if (result.length <= 0) {
        console.log("No video found with this vidid: " + id)
      } else {
        console.log("Video found in DB.");
        node = JSON.parse(JSON.stringify(result[result.length - 1]));

        console.log('File name: ' + fileName);
        console.log('Image name: ' + imgFileName);
        console.log('Starting python script');

        var pyVidName = '';
        var options = {
          mode: 'text',
          args: [fileName, imgFileName]
        };

        node.mash = 'Running...';
        mongodbUpdate(node, 'update');
        //run python script
        pythonShell.run('video_morph.py', options, function (err, results) {
          if (err) {
            // update mash value and throw error
            console.log("updating mash value to failed!");
            node.mash = "failed!";
            mongodbUpdate(node, 'update');
            throw err;
          };
          // results wonder if it will print...
          console.log('script finished.  printing results\n')

          results.forEach(function (element) {
            console.log(element);
          }, this);

          pyVidName = results[(results.length - 1)].replace(/(\r\n|\n|\r)/gm, "");
          console.log("Got file name: " + pyVidName)

          node.mash = "http://127.0.0.1:3000/" + pyVidName;
          //node.mash = "http://ec2-34-210-6-0.us-west-2.compute.amazonaws.com:3000/" + pyVidName;

          mongodbUpdate(node, 'update');
          var filePath = path.join(__dirname, '/vids/', pyVidName);
          console.log('[' + Date() + '] Finished ' + filePath);
        });
      }

      db.close();
    });

    //send HTML to client
    res.writeHead(200, { "Content-Type": "text/html" });
    //res.write("Downloading " + node.url + ' to ' + filePath);
    res.write("Modifying file and generating link.  Process could take a long time.");
    res.end();
  });
}

//Remove items from DB.  WIll delete just item in DB, download file, and modified file.
function remove(req, res) {
  console.log("Removing video from DB.");
  var query = url.parse(req.url, true).query;
  var id = query.id;
  var sourceVid = '';
  var mashVid = '';
  var filePath = path.join(__dirname, '/vids/');
  var node = null;
  var myQuery = { "vidid": id };

  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;

    db.collection("Videos").find(myQuery).toArray(function (err, result) {
      if (err) throw err;
      //console.log(result);
      if (result.length <= 0) {
        console.log("No video found with this vidid: " + id)
      } else {
        console.log("Video found in DB.");
        node = JSON.parse(JSON.stringify(result[result.length - 1]));

        if (node.download) {
          sourceVid = path.basename(url.parse(node.download).pathname);
          fs.unlink((filePath + sourceVid), function (err, res) {
            if (err) { throw err; }
            console.log("Deleted: " + sourceVid);

          });
        }

        if (node.mash) {
          mashVid = path.basename(url.parse(node.mash).pathname);
          fs.unlink((filePath + mashVid), function (err, res) {
            if (err) { throw err; }
            console.log("Deleted: " + mashVid);
          });
        }
      }
    });

    db.close()
  });
  // delete record
  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;
        db.collection("Videos").remove(myQuery, function (err, obj) {
          if (err) throw err;
          console.log(obj.result.n + " document(s) deleted");
        
        });

    db.close()
  });

  // HTML response
  //redirect(req, res, './dashboard')
  res.writeHead(200, { "Content-Type": "text/html" });
  res.write("Deleting info.  Refresh the dashboard to update.");
  res.end();

}

//Pulls API key from MongoDB
function getAuthKey() {

  mongoClient.connect(mongoURL, function (err, db) {
    if (err) throw err;
    var query = { name: "ytAPIKey" };
    db.collection("AppSettings").find(query).toArray(function (err, result) {
      if (err) { throw err };
      if (result.length > 0) {
        authData = result[(result.length - 1)].value;
        console.log("API key grabbed from db for GoogleAPI.");
      }
      else {
        console.log("API key could not be found.  :(");
      }
      db.close();
    });
  });
}

//Sends Search HTML (primary first load for application)
function renderSearch(req, res) {
  console.log('[' + Date() + '] Rendering Search.');
  var filePath = path.join(__dirname, 'html/search.html');
  var stat = fs.statSync(filePath);

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Content-Length': stat.size
  });

  var readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
}

//Updates DB.  If document(record) is not there will create new entry.  Based on YouTube ID for video.
function mongodbUpdate(node, myAction) {
  mongoClient.connect(mongoURL, function (err, db) {
    if (err) {
      console.log(err);
      throw err;
    } else {
      var myCollection = db.collection("Videos");
      var mySelector = {};
      var myOptions = {};
      var myCriteria = {};
      if (myAction == "add") {
        mySelector = { "vidid": node.vidid };
        myOptions = { "upsert": true };
        myCriteria = node;
      } else if (myAction == 'update') {

        node._id = null;
        delete node._id;
        node.updated = Date();
        mySelector = { "vidid": node.vidid }
        myOptions = {};
        myCriteria = node;
      }
    }

    myCollection.update(mySelector, myCriteria, myOptions, function (err, result) {
      if (err) {
        console.log("Error on insert/update: " + err);
        throw err
      }
      console.log(node.vidid + ": has been updated.");
    });
    //console.log("Video ID: " + node.vidid + " Updated.");
    db.close();
  });
}
