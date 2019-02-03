const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const urllib = require('url');
var http = require('http');
var https = require('https');
var fs = require('fs');

var mysql      = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'blocket',
	password : 'ztMQ1i5JzA2bqODk',
	database : 'Blocket'
});

connection.connect();

getAnnonser();

function getAnnonser() {
	var query = "SELECT * FROM annons WHERE annons.scrapeddate IS NULL AND url != \"\"";
	connection.query(query,function(err, result) {
		if(err) {
			console.log(err);
		}
		else {
			//console.log(result);
			for(let i = 0; i < result.length; i++) {
				var annons = result[i];
				console.log(annons.url);

				getAnnons(annons);
			}
		}
	})
}


function getAnnons(annons) {
	var url = annons.url;
	console.log("Download ",url);

	/*JSDOM.fromURL(url).then(dom => {
		if(dom.window.document.querySelector(".subject_large")) {
		annons.title = dom.window.document.querySelector(".subject_large").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
	}
	else if(dom.window.document.querySelector(".subject_medium")) {
		annons.title = dom.window.document.querySelector(".subject_medium").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
	}*/
	/*if(dom.window.document.querySelector("#list_id"))
	 {
	 annons.blocket_id = dom.window.document.querySelector("#list_id").value;
	 }*/
	if(dom.window.document.querySelector("#vi_price")) annons.price = dom.window.document.querySelector("#vi_price").textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"");
	if(dom.window.document.querySelector(".area_label")) annons.place = dom.window.document.querySelector(".area_label").textContent.replace(/\(|\)| /g, "");
	if(dom.window.document.querySelector(".row.mtm.mbxl .body")) annons.description = dom.window.document.querySelector(".row.mtm.mbxl .body").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
	//if(dom.window.document.querySelector("time")) annons.publishdDate = dom.window.document.querySelector("time").getAttribute("datetime");
	if(dom.window.document.querySelector("#login_to_reply_name")) annons.seller.name = dom.window.document.querySelector("#login_to_reply_name").textContent;
	var images = [];
	if(dom.window.document.querySelector(".carousel-inner")) images = dom.window.document.querySelector(".carousel-inner").children;
	for(var i = 0; i < images.length; i++) {
		var image_url = images[i].children[0].getAttribute("src");
		if(urllib.parse(image_url).protocol) {
			annons.images.push(image_url);
			if(!dryrun) {
				getImage(image_url, annons.blocket_id,connection);
			}
		}
	}

	//annonser.push(annons);

	var seller_id = null;
	var place_id = null;

	var whenDone = function() {
		//downloadNextAnnons(id+1);
	};

	var insertAnnons = function() {
		console.log("Inserting annons ", annons.blocket_id);
		//console.log("fk_seller",seller_id,"fk_place",place_id);

		var query = "INSERT INTO annons "+
			"SET blocket_id=?, "+
			"fk_seller=?, "+
			"price=?, "+
			"fk_place=?, "+
			"title=?, "+
			"description=?, "+
			"publishDate=?, "+
			"lan=?, " +
			"url=?, "+
			"category=?";
		connection.query(query, [annons.blocket_id, seller_id, annons.price, place_id, annons.title, annons.description, annons.publishDate, annons.lan, url, annons.category],function(err, result) {
			//console.log("Annons Insert",result);
			if (err)
			{
				console.log("Failure (Old)");
				//console.log('Error while performing Query.',err);
			}
			else {
				console.log("Success");
				annons.id = result.insrtId;
				/*for(var i = 0; i < annons.images.length; i++) {
				 connection.query('INSERT INTO image SET blocket_url=?, filename=?', [annons.images[i], ""],function(err, result) {
				 //console.log("Place Insert",result);
				 if (err)
				 {

				 }

				 });
				 }*/
			}
			whenDone();
		});
	}

	var insertPlace = function() {
		connection.query('INSERT INTO place SET name=?', annons.place,function(err, result) {
			//console.log("Place Insert",result);
			if (err)
			{
				//console.log('Error while performing Query.');
				connection.query('SELECT id FROM place WHERE name=?',annons.place, function(err, result) {
					console.log(result);
					place_id = result[0].id;
					if(!dryrun) {
						insertAnnons();
					}
				});
			}
			else {
				if(result.insertId) {
					place_id = result.insertId;
					if(!dryrun) {
						insertAnnons();
					}
				}
			}

		});
	}

	connection.query('INSERT INTO seller SET name=?', annons.seller.name,function(err, result) {
		//console.log("Insert Seller",result);
		if (err)
		{
			//console.log('Error while performing Query.');
			connection.query('SELECT id FROM seller WHERE name=?',annons.seller.name, function(err, result) {
				console.log(result);
				seller_id = result[0].id;
				if(!dryrun) {
					insertPlace();
				}
			});
		}
		else {
			if(result.insertId) {
				seller_id = result.insertId;
				if(!dryrun) {
					insertPlace();
				}
			}
		}

	});

	/*connection.query('INSERT INTO place SET name', annons.place,function(err, result) {
	 console.log(result);
	 if (err)
	 {
	 console.log('Error while performing Query.',err);
	 }
	 });*/

	/*for(var image in images) {
	 console.log(images[image].children[0].getAttribute("src"));
	 }*/
	//console.log(images.getAttribute("src"));
	//console.log(JSON.stringify(article));
	console.log(annons);
});
}

function getImage(url, blocket_id,connection) {
	var split = url.split("/");
	var dest = split[split.length-1];
	var cb = null;

	var dir = "images/"+blocket_id+"/";

	var params = [url, (dest.split(".")[0]), blocket_id];
	//console.log(params);
	connection.query('INSERT INTO image SET blocket_url=?, filename=?, fk_blocket_id=?', params,function(err, result) {
		//console.log("Image Insert",result);
		if (err)
		{
		}
		else {
			console.log("Image inserted")
		}
	});

	if (!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	if (!fs.existsSync(dir+dest)){
		console.log("Downloading image ",url);
		var file = fs.createWriteStream(dir+dest);

		var request = https.get(url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				file.close(cb);
			});
		});
	}

}
