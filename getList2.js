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

var timeout = "1000";

var url = "https://www.blocket.se/hela_sverige/mopeder_a-traktor/mopeder?ca=11&st=s&cg=1120&c=1121&f=p&w=3";
var dryrun = false;

for(var i = 2; i < process.argv.length; i++) {
	console.log(process.argv[i]);
	if(urllib.parse(process.argv[i]).protocol) {
		url = process.argv[i];
		//console.log("Param is url");
	}
	if(process.argv[i] == "-dryrun") {
		dryrun = true;
		console.log("Dryrun!");
	}
}

var annonser = [];

getAnnonser(url, annonser);

function getAnnonser(url, annonser) {

	JSDOM.fromURL(url).then(dom => {
	var articles = dom.window.document.querySelector("#item_list").children;
	for(var i = 0; i < articles.length; i++) {
		var annons = {
			seller: {
				name: ""
			},
			publishdDate: "1970-01-01T00:00",
			place: "",
			title: "",
			description: "",
			price: null,
			images: [],
			url: "",
			lan: ""
		};

		var article = articles[i];
		if(article) {
			if(article.children.length > 0) {
				var id = article.getAttribute("id");
				var value;
				if(id) {
					//console.log(id.indexOf("item_") > -1, id.substring(5));
					annons.blocket_id = id.substring(5);

					var html = dom.window.document.querySelector("#"+id+ " .media-body.desc header .pull-left");
					if(html) {
						var things = html.textContent.split(",");
						var lan = things[1];
						var category = things[0];
						//console.log("Category: ",category,"Län: ",lan);
						annons.lan = lan;
						annons.category = category;
					}

					html = dom.window.document.querySelector("#"+id+ " .list_price");
					if(html) {
						value = html.textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"");
						if(value != "") {
							annons.price = value;
						}
					}

					html = dom.window.document.querySelector("#"+id+" .item_link");
					if(html) {
						annons.title = html.textContent;
					}

					html = dom.window.document.querySelector("#"+id+" time");
					if(html) {
						annons.publishdDate = html.getAttribute("datetime");
					}
				}

				var annons_url = article.children[0].getAttribute("href");
				if(annons_url != null)
				{
					//console.log(annons_url);
					annons.url = annons_url;
					annonser.push(annons);

					console.log(annons);
					//console.log("Inserting annons ", annons.blocket_id);
					//console.log("fk_seller",seller_id,"fk_place",place_id);
				}
			}
		}
	}
	var values = [];
	for(i = 0; i < annonser.length; i++) {
		var a = annonser[i];
		values.push([a.blocket_id, a.price, a.title, a.publishdDate, a.lan, a.url, a.category]);
	}
	/*var query = "INSERT INTO annons "+
		"SET blocket_id=?, "+
		"price=?, "+
		"title=?, "+
		"publishDate=?, "+
		"lan=?, " +
		"url=?, "+
		"category=?";*/
	var query = "INSERT IGNORE INTO annons (blocket_id, price, title, publishDate, lan, url, category) VALUES ?";
	connection.query(query, [values],function(err, result) {
		//console.log("Annons Insert",result);
		if (err)
		{
			console.log("Failure", err);
			//console.log('Error while performing Query.',err);
		}
		else {
			console.log("Success");
			//annons.id = result.insrtId;

			//console.log(annonser);
			var nextpage = dom.window.document.querySelector("#all_pages li:nth-last-child(2)").children[0];
			//console.log(nextpage.innerHTML);
			if(nextpage.innerHTML.indexOf("Nästa sida") >= 0)
			{
				var next_href = nextpage.getAttribute("href");
				url = url.substring(0, url.indexOf("?"))+next_href;
				console.log("Next URL: ",url);
				console.log(annonser.length);
				getAnnonser(url, annonser);
			}
			else {
				console.log("DONE!");
				console.log(annonser.length);
				//downloadList(annonser);
				//checkDead();
				process.exit();
			}
		}
	});

	});
}