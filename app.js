var express = require('express');
var app = express();
var multer = require('multer');
var fs = require('fs');
var mkdirp = require('mkdirp');
var mongodb = require('mongodb');
var mongodbUrl = 'mongodb://localhost:27017/trackbrowser';
var assert = require('assert');

var SCREENSHOT_STORE_PATH = './data/userBrowsingData';

// set static assets
app.use(express.static('public'));

var storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null, SCREENSHOT_STORE_PATH)
	},
	filename: function(req, file, cb) {
		cb(null, file.originalname)
	}
});

app.use(multer({ storage: storage }).single('imageAttachment'));

/*
		Check if user navigation data folder exists
		and create one if not exists
*/
mkdirp(SCREENSHOT_STORE_PATH, function(err) {
	if (err) { console.log(err); }
	else {
		console.log('Screenshot store path: ' + SCREENSHOT_STORE_PATH);
	}
});

var pictureArr;

// read files from "pictures" directory
var readImageFiles = function() {
	fs.readdir("public/pictures", function(err, imageList) {
		pictureArr = imageList;

		console.log(pictureArr);
	});
};

readImageFiles();

var MongoClient = mongodb.MongoClient;

MongoClient.connect(mongodbUrl, function(err, db) {
	assert.equal(null, err);
	console.log("Connected correctly to MongoDB server.");

	// router
	app.get('/', function(req, res) {
		res.end("TrackBrowser Server");
	});
	
	 // username, research topic
	app.post('/api/v1/researchtopic', function(req, res) {
		console.log("/api/v1/researchtopic");
		console.log(req.body);
		
		db.collection('research_topic').insertOne(req.body, function(err, result) {
			assert.equal(err, null); 
			console.log("Inserted research topic data to research_topic collection"); 
		});
		
		res.end("research-topic received");
	});

	app.get('/api/v1/picture/user/:id', function(req, res) {

	});

	// server alive check
	app.get('/api/v1/echo', function(req, res) {
		console.log("server echo back");
		res.end("echo");
	});

	// user navigation
	app.post('/api/v1/browsingdata', function(req, res) {
		console.log("browsing-data");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted browsing data to browsing_data collection. ");
		});

		res.end("browsing data");
	});

	// screenshot
	app.post('/api/v1/screenshot', function (req, res) {
		console.log("screenshot received from client");

		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted screenshot data to browsing-data collection. ");
		});

		res.end("Response");
	});

	app.listen(8082, function() {
		console.log("Listening to port 8082");
	});
});