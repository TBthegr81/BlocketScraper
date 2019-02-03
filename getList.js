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

//var url = "https://www.blocket.se/stockholm/mopeder_a-traktor?ca=11&cg=1120&st=s&l=0&f=p&w=1h";
//var url = "https://www.blocket.se/stockholm/mopeder_a-traktor/mopeder?ca=11&cg=1120&st=s&c=1121&f=p&w=1";
//var url = "https://www.blocket.se/hela_sverige/mopeder_a-traktor/mopeder?ca=11&st=s&cg=1120&c=1121&f=p&w=3";
var url = "https://www.blocket.se/hela_sverige/mopeder_a-traktor?ca=11&st=s&cg=1120&s=1&w=3";
var dryrun = false;

for(var i = 2; i < process.argv.length; i++) {
  console.log(process.argv[i]);
  if(urllib.parse(process.argv[i]).protocol) {
    url = process.argv[i]
    //console.log("Param is url");
  }
  if(process.argv[i] == "-dryrun") {
    dryrun = true;
    console.log("Dryrun!");
  }
}

var annonser = [];

getAnnonser(url, annonser);

function downloadList() {
  /*if(annonser.length > 0) {
    getAnnons(annonser[0]);
  }*/
  /*for(var i = 0; i < annonser.length; i++) {
    getAnnons(annonser[i]);
  }*/
  downloadNextAnnons();
}
function downloadNextAnnons(i = 0) {
  //console.log("I:",i);
  if(annonser.length>i ) {
  //if(1>i) {
    setTimeout(getAnnons.bind(this, i),timeout);
  }
  else {
    checkDead();
  }
}

function checkDead() {
  console.log("Checking deads");

  connection.query('SELECT blocket_id FROM annons WHERE scrapedDate IS NULL', function(err, result) {
    //console.log(result);
    var good;
    //var toDelete = [];
    for(var i = 0; i < result.length; i++) {
      good = false;
      //console.log("Looking for ID",result[i].blocket_id);
      for(var j = 0; j < annonser.length; j++) {
        //console.log(annonser[j].blocket_id);
        if(result[i].blocket_id == annonser[j].blocket_id) {
          good = true;
          break;
        }
      }
      if(!good) {
        console.log("Old annons was not found in those downloaded, probably deleted");
        //toDelete.push(result[i].blocket_id);
        if(!dryrun) {
          connection.query('UPDATE annons SET scrapedDate=NOW() WHERE blocket_id=?',result[i].blocket_id, function(err, result) {
            console.log(err, result);
          });
        }
      }
      else {
        console.log("Annons found, don't delete");
      }
    }

    //console.log("To delete: ", toDelete);
  });

  //process.exit();
}

function getAnnons(id) {
  var annons = annonser[id];
  var url = annons.url;
  console.log("Download ",url);

  JSDOM.fromURL(url).then(dom => {
    if(dom.window.document.querySelector(".subject_large")) {
      annons.title = dom.window.document.querySelector(".subject_large").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
    }
    else if(dom.window.document.querySelector(".subject_medium")) {
      annons.title = dom.window.document.querySelector(".subject_medium").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
    }
    /*if(dom.window.document.querySelector("#list_id"))
    {
      annons.blocket_id = dom.window.document.querySelector("#list_id").value;
    }*/
    if(dom.window.document.querySelector("#vi_price")) annons.price = dom.window.document.querySelector("#vi_price").textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"");
    if(dom.window.document.querySelector(".area_label")) annons.place = dom.window.document.querySelector(".area_label").textContent.replace(/\(|\)| /g, "");
    if(dom.window.document.querySelector(".row.mtm.mbxl .body")) annons.description = dom.window.document.querySelector(".row.mtm.mbxl .body").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
    if(dom.window.document.querySelector("time")) annons.publishdDate = dom.window.document.querySelector("time").getAttribute("datetime");
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
      downloadNextAnnons(id+1);
    }

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
      var id = article.getAttribute("id");
      if(id) {
        //console.log(id.indexOf("item_") > -1, id.substring(5));
        annons.blocket_id = id.substring(5);

				var html = dom.window.document.querySelector("#"+id+ " .media-body.desc header .pull-left");
				if(html) {
          var things = html.textContent.split(",");
					var lan = things[1];
          var category = things[0];
					console.log("Category: ",category,"Län: ",lan);
					annons.lan = lan;
          annons.category = category;
				}

      }

      if(article) {
        if(article.children.length > 0) {
          var annons_url = article.children[0].getAttribute("href");
          if(annons_url != null)
          {
            //console.log(annons_url);
            annons.url = annons_url;
            annonser.push(annons);
          }
        }
      }
    }
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
      downloadList(annonser);
      //checkDead();
    }


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
