var mongoClient = require('mongodb').MongoClient;
var mongoURL = "mongodb://127.0.0.1:27017/Mash";

/*
    To create Mash Database:  
    Make sure mongoURL has proper IP/URL.  Defualt is 127.0.0.1 (localhost).  Change if necessary.
    Uncomment out createDB and creatTables and run "node createmongodb.js".
    Comment those back out and then uncomment out addAppData and rerun "node createmongdb.js"
    you can try to run all 3 but sometimes due to asyncronous behaviour it pulls error.
    
    Database name: Mash
    2 Collections (tables):   AppData, Videos

    Note: make sure mongoDB service is running.
*/

//createDB();
//createTables();
//addAppData();

/*
    Functions to view, remove collections, and documents(records from collection).  Uncomment out whichever function
    and run "node createmongodb.js"
*/

//deleteCollection("Videos");
//removeAllRecords("Videos");
//seeCollection("Videos");


//Create DB for application
function createDB() {

    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        console.log("Database Mash has been created!");
        db.close();
    });

}

//Create Collections/Tables
function createTables() {

    //create videos table
    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        //create videos table for saving downloaded videos
        db.createCollection("Videos", function (err, res) {
            if (err) throw err;
            console.log("Table Videos has been created!");
            db.close();
        });

        //create videos table for saving downloaded videos
        db.createCollection("AppSettings", function (err, res) {
            if (err) throw err;
            console.log("Table AppSettings has been created!");
            db.close();
        });

    });
}

//Insert Application Data needed for app.
function addAppData() {

    // add Youtube api key into Database Mash
    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        var myobj = { name: "ytAPIKey", value: "AIzaSyCxyNbf2dgN4Vrlmnf7j26zXJpknusKzww" };
        db.collection("AppSettings").insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("Added YouTube Key");
            console.log("Results:" + res)
            db.close();
        });
    });

}

//View all documents (records) within the given collection parameter in the function
function seeCollection(myCollection) {
    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        db.collection(myCollection).find({}).toArray(function (err, result) {
            if (err) throw err;
            console.log(result);
            console.log("Record Count: " + result.length);
            db.close();
        });
    });
}

//Remove collection (table) from Mash DB by given parameter
function deleteCollection(myCollection) {

    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        db.collection(myCollection).drop(function (err, delOK) {
            if (err) throw err;
            if (delOK) console.log("Table deleted");
            db.close();
        });
    });
}

//Remove all records from given collection(table) parameter
function removeAllRecords(myCollection){

    mongoClient.connect(mongoURL, function (err, db) {
        if (err) throw err;
        db.collection(myCollection).remove({},function (err, res) {
            if (err) throw err;
            console.log("removed records " + res);
            db.close();
        });
    });
}
