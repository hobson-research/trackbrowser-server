var express = require('express');
var app = express();
var http = require('http').Server(app);
var multer = require('multer');
var fs = require('fs');
var mkdirp = require('mkdirp');
var sizeOf = require('image-size');
var io = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/trackbrowser';
var db;

var SCREENSHOT_STORE_PATH = './data/userBrowsingData';

// set static assets
app.use(express.static('public'));
app.set('view engine', 'jade');
app.locals.pretty = true;

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

var checkIfPictureAtIndexExistsAndCreate = function(index) {
	// if invalid index, begin at 0
	if (typeof index !== "number") index = 0;

	// if index is equal or larger than picturesArr length, stop recursive call
	if (index >= picturesArr.length) return;

	/*

	 {
	 fileName: "H1.png",
	 users: ["1311", "1511", "11948"],
	 userCount: 0
	 },
	 {
	 fileName: "H2.jpg",
	 users: ["1611", "1133", "1721"],
	 userCount: 0
	 }

	 */

	// find by fileName
	db.collection("pictures").findOne(
		{
			fileName: picturesArr[index]
		},
		function(err, pictureData) {
			if (err) {
				console.log("Error retrieving picture data for " + picturesArr[index]);
				console.log(err);

				return;
			}

			// if picture data already exists,
			// check next element in the array
			if (pictureData !== null) {
				checkIfPictureAtIndexExistsAndCreate(index + 1);
			}

			// if picture data doesn't exist,
			// insert a item
			else {
				db.collection("pictures").insertOne({
					fileName: picturesArr[index],
					users: [],
					userCount: 0
				}, function(err, result) {
					if (err) console.log("Error inserting a new picture item to database");

					// continue to next element
					checkIfPictureAtIndexExistsAndCreate(index + 1);
				});
			}
		}
	);
};

// read files from "pictures" directory
var readImageFiles = function() {
	fs.readdir("public/pictures", function(err, imageList) {
		picturesArr = imageList;

		console.log("# of pictures: " + picturesArr.length);

		// create database collection to record
		// how many users each image has been served to
		checkIfPictureAtIndexExistsAndCreate(0);
	});
};

// get daily image for user
// if the daily image already exists for day, return that image
// otherwise, find a new daily image
var getImageForUser = function(userName, callback) {
	var currentDate = new Date().toISOString().substring(0, 10);

	var dailyPicturesCollection = db.collection("daily_user_pictures");
	var picturesCollection = db.collection("pictures");

	dailyPicturesCollection.findOne(
		{
			userName: userName,
			date: currentDate
		},
		function(err, todayPictureData) {
			if (err) {
				console.log("Error retrieving today's picture data (" + currentDate + ")");
				console.log(err);

				return;
			}

			// if the user data already exists
			if (todayPictureData !== null) {
				callback(todayPictureData.fileName, false);
			}

			else {
				console.log("user does not have a picture selected yet for today");

				var cursor = picturesCollection.find({
					users: { $nin: [userName] }
				}).sort({
					userCount: 1
				}).limit(1);

				cursor.each(function(err, doc) {
					if (err) {
						// if error, do nothing
						console.log("Error retreiving pictures cursor");
						return;
					}

					if (doc !== null) {
						doc.users.push(userName);
						doc.userCount++;

						// update the record
						picturesCollection.updateOne(
							{"_id": doc._id},
							{
								$set: {
									"users": doc.users,
									"userCount": doc.userCount
								}
							}, function(err, results) {
								dailyPicturesCollection.insertOne({
									"date": currentDate,
									"userName": userName,
									"fileName": doc.fileName
								}, function(err, results) {
									callback(doc.fileName, true);
								});
							}
						);
					}
				});
			}
		}
	);
}

var init = function() {
	console.log("init()");

	// read images into array and insert into database
	readImageFiles();
	
	io.on('connection', function(socket) {
		console.log("a new user viewing web UI connected"); 
	});

	// router
	app.get('/', function(req, res) {
		db.collection("browsing_data")
			.find()
			.sort({'_id': -1})
			.limit(100)
			.toArray()
			.then(function(documents) {
				console.log("Returned " + documents.length + " browsing data");
				
				for (var i = 0; i < documents.length; i++) {
					console.log(documents[i].type); 
				}
				
				res.render('index', {
					"title": "TrackBrowser Browsing Data", 
					"browsingDataArr": documents
				});
			});
	});
	
	// return static screenshot file
	app.get('/screenshot/:fileName', function(req, res) {
		res.sendFile(__dirname + "/data/userBrowsingData/" + req.params.fileName); 
	});

	// server alive check
	app.get('/api/v1/echo', function(req, res) {
		console.log("server echo back");
		res.end("echo");
	});

	// retrieve picture to display
	app.get('/api/v1/picture/user/:id', function(req, res) {
		console.log(req.params);

		getImageForUser(req.params.id, function(fileName, isFirstTimeToday) {
			var imagePath = __dirname + '/public/pictures/' + fileName;
			console.log(imagePath);

			sizeOf(imagePath, function (err, dimensions) {
				console.log(dimensions.width, dimensions.height);

				var returnObj = {
					"url": "http://52.32.246.19:8082/pictures/" + fileName,
					"width": dimensions.width,
					"height": dimensions.height
				};
				
				var returnObjJSON = JSON.stringify(returnObj); 
				
				// return picture information to participant
				res.end(returnObjJSON);
				
				// create a date object to record to database
				recordDate = new Date(); 
				
				// add datetime and username
				returnObj.type = "picture-selection"; 
				returnObj.fileName = fileName; 
				returnObj.userName = req.params.id;
				returnObj.isFirstTimeToday = isFirstTimeToday; 
				returnObj.date = recordDate.toGMTString();
				returnObj.timestamp = recordDate.getTime(); 
				
				db.collection('browsing_data').insertOne(returnObj, function(err, result) {
					assert.equal(err, null); 
					console.log("Inserted picture selection data to browsing_data collection"); 
				});
				
				// broadcast picture select information
				io.emit("new activity", returnObj); 
			});
		});
	});

	// username, research topic
	app.post('/api/v1/researchtopic', function(req, res) {
		console.log("/api/v1/researchtopic");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted research topic data to browsing_data collection");
		});
		
		// return response
		res.end("research-topic received"); 
		
		// broadcast research topic information
		io.emit("new activity", req.body); 
	});

	// user navigation
	app.post('/api/v1/browsingdata', function(req, res) {
		console.log("browsing-data");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted navigation data to browsing_data collection. ");
		});

		// return response
		res.end("browsing data");
		
		// broadcast research topic information
		io.emit("new activity", req.body); 
	});

	// scroll events
	app.post('/api/v1/scroll', function(req, res) {
		console.log("scroll");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted scroll data to browsing_data collection. ");
		});
		
		// return response
		res.end("scroll event record complete"); 
		
		// broadcast research topic information
		io.emit("new activity", req.body); 
	});

	// file download events
	app.post('/api/v1/download', function(req, res) {
		console.log("download complete event received from the client");
		console.log(req.body);

		db.collection('browsing_data').insertOne(req.body, function(err, result) {
			assert.equal(err, null);
			console.log("Inserted file download details to file_download collection");
			
			res.end("file download event record complete"); 
			
			// broadcast file download event
			io.emit("new activity", req.body); 
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
		
		// broadcast research topic information
		io.emit("new activity", req.body); 
	});

	http.listen(8082, function() {
		console.log("Listening to port 8082");
	});
};

MongoClient.connect(url, function(err, dbInstance) {
	if (err) console.log("Error connecting to MongoDB database. ");

	db = dbInstance;

	init();
});