var express = require('express');
var app = express();
var multer = require('multer');
var fs = require('fs');
var mkdirp = require('mkdirp');
var sizeOf = require('image-size');
var assert = require('assert');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/trackbrowser');

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

var picturesArr = null;

// read files from "pictures" directory
var readImageFiles = function() {
	fs.readdir("public/pictures", function(err, imageList) {
		picturesArr = imageList;

		console.log(picturesArr);
	});
};

var getRandomImageForUser = function(userId, callback) {
	var imageIndex = Math.floor(Math.random() * picturesArr.length);

	callback(picturesArr[imageIndex]);
};

readImageFiles();

// var MongoClient = mongodb.MongoClient;

var db = mongoose.connection;
var init = function() {
	console.log("init()");

	// router
	app.get('/', function(req, res) {
		res.end("TrackBrowser Dashboard");
	});

	// server alive check
	app.get('/api/v1/echo', function(req, res) {
		console.log("server echo back");
		res.end("echo");
	});

	// retrieve picture to display
	app.get('/api/v1/picture/user/:id', function(req, res) {
		console.log(req.params);

		getRandomImageForUser(req.params.id, function(fileName) {
			var imagePath = __dirname + '/public/pictures/' + fileName;
			console.log(imagePath);

			sizeOf(imagePath, function (err, dimensions) {
				console.log(dimensions.width, dimensions.height);

				var returnObj = {
					// "url": "http://10.88.187.97:8082/pictures/" + fileName,
					"url": "http://52.32.246.19:8082/pictures/" + fileName,
					"width": dimensions.width,
					"height": dimensions.height
				};

				res.end(JSON.stringify(returnObj));
			});


		});
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

	// user navigation
	app.post('/api/v1/browsingdata', function(req, res) {
		console.log("browsing-data");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted navigation data to browsing_data collection. ");
		});

		res.end("browsing data");
	});

	// scroll events
	app.post('/api/v1/scroll', function(req, res) {
		console.log("scroll");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted scroll data to browsing_data collection. ");
		});
	});

	// file download events
	app.post('/api/v1/download', function(req, res) {
		console.log("download complete event received from the client");
		console.log(req.body);

		 db.collection('file_download').insertOne(req.body, function(err, result) {
			 assert.equal(err, null);
			 console.log("Inserted file download details to file_download collection");
		 });
	});

	// screenshot
	app.post('/api/v1/screenshot', function(req, res) {
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
};

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log("Connected correctly to MongoDB server.");

	init();
});