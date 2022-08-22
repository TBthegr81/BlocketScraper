const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const urllib = require('url');
var https = require('https');
var fs = require('fs');
var mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);

var annonsSchema = new mongoose.Schema({
  seller: {
    name: String
  },
  publishedDate: Date,
  place: String,
  title: String,
  description: String,
  category: String,
  price: Number,
  images: [
    String
  ],
  url: String,
  lan: String,
  deleted: {type: "Boolean", default: "false"},
  blocket_id: {type: "Number", required: true, unique: true},
  history: [{
        event: {type: String},
        date: { type: Date, default: Date.now },
        key: String,
        oldValue: String
      }]
});
var Annons = mongoose.model('Annons', annonsSchema);
/*
 CONFIG
*/
const INTERVAL = 15; // Interval to scrape in Minutes
const SLEEPTIME = 1000; // Sleeptime between annons in miliseconds
const IMAGEDIR = "images/";// Path to folder for saving images
const AREA = "hela_sverige";
const CATEGORY = "mopeder_a-traktor/mopeder";
const COUNTRY = "se";
const PARAMS = {
  ca: 11,
  st: "s",
  cg: 1120,
  c: 1121,
  f: "p",
  w: 3,
  o: 39
}
var dryrun = false;

init();

function init() {
  for(var i = 2; i < process.argv.length; i++) {
  	if(process.argv[i] == "-dryrun") {
  		dryrun = true;
  		console.log("Dryrun!");
  	}
  }

  mongoose.connect('mongodb://localhost/Blocket', {useNewUrlParser: true});
  var db = mongoose.connection;
  db.on('error', function(error) {
    console.error('connection error:', error);
    process.exit(-1);
  });
  db.once('open', function() {
   console.log("we're connected!");

   scrape();
   //updateList();

   setInterval(scrape, INTERVAL*6000);
  });
}

function scrape() {
  console.log("Scrapin'");
  var url = buildUrl();
  console.log("URL: ",url);
  getList(url, function(items) {
    //console.log("We got some items!");
    console.log(items.length);
    deleteNotInList(items);
    //console.log(items);
    updateList();
  });
}

function deleteNotInList(items) {
  console.log("Deleting Items Not In The List");
  let blocket_ids = [];
  for(let item in items) {
    blocket_ids.push(items[item].blocket_id);
  }
  if(blocket_ids.lengt > 0) {
    Annons.find({ blocket_id: { $nin: blocket_ids }, deleted: false}, function(err, items) {
      console.log(items);
      for(let i in items) {
        let annons = items[i];
        annons.deleted = true;
        annons.history.push({event: "deleted", key: "deleted", oldValue: false});
        annons.save(function (err) {
          if (err) console.error(err);
          else {
            console.log("Saved");
          }
        });
      }
    });
  }

  //Annons.updateMany( { blocket_id: { $nin: blocket_ids }, deleted: false}, { deleted: true }, function(res) {console.log(res);});
}

function buildUrl() {
  var url = "https://www.blocket."+COUNTRY+"/"+AREA+"/"+CATEGORY+"?";
  for(let param in PARAMS) {
    if(PARAMS.hasOwnProperty(param)) {
      url+=param+"="+PARAMS[param]+"&";
    }
  }
  return url;
}

function getList(url, done, items = []) {
  JSDOM.fromURL(url).then(dom => {
  	var articles = dom.window.document.querySelector("#item_list").children;
    for(let li in articles) {
       if(articles.hasOwnProperty(li)) {
         var article = articles[li];
         let annons = {
           history: []
         }
     		/*	seller: {
     				name: ""
     			},
     			publishedDate: "1970-01-01T00:00",
     			place: "",
     			title: "",
     			description: "",
     			price: null,
          blocket_id: null,
     			images: [],
     			url: "",
     			lan: "",
          deleted: false
     		};*/

        var id = article.getAttribute("id");
        if(!id) continue;
        annons.blocket_id = id.substring(5);
        annons.deleted = false;
        annons.history.push({event:"scraped"});

        if((html = dom.window.document.querySelector("#"+id+ " .media-body.desc header .pull-left")) != null) {
          var things = html.textContent.split(",");
          var lan = things[1];
          var category = things[0];
          //console.log("Category: ",category,"Län: ",lan);
          annons.lan = lan;
          annons.category = category;
        }

        if((html = dom.window.document.querySelector("#"+id+ " .list_price")) != null) {
          if((value = html.textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"")) != "") {
            annons.price = value;
          }
        }

        if((html = dom.window.document.querySelector("#"+id+" .item_link")) != null) {
          annons.title = html.textContent;
        }

        if((html = dom.window.document.querySelector("#"+id+" time")) != null) {
          annons.publishedDate = html.getAttribute("datetime");
        }

        if(article.children.length > 0) {
          if((href = article.children[0].getAttribute("href")) ? annons.url = href : "");
        }

        console.log(annons);

        //items.push(annons);
        /*Annons.update({blocket_id: annons.blocket_id}, annons, {upsert: true, setDefaultsOnInsert: true}, function (err) {
          console.log("Worked out ok?");
        });*/
        Annons.find({ blocket_id: annons.blocket_id }, function(annons, err, items) {
          console.log(annons.blocket_id);
          if (err) console.error(err);
          else {
            //console.log(items);
            //for(let i in items) {
            if(items.length > 0) {
              // Already exists check for updates
              console.log("Found old annons");
              var old_annons=items[0];
              for(let key in annons) {
                if(annons.hasOwnProperty(key) && key != "history"){
                  if(key in old_annons) {
                    if(old_annons[key]==annons[key]  || new Date(old_annons[key]).getTime() == new Date(annons[key]).getTime()) {
                      // Same dont update
                    }
                    else {
                      // Update an add to history
                      annons.history.push({event: "update", key: key, oldValue: old_annons[key]});
                      old_annons[key]=annons[key];
                      console.log("Updating "+key, annons[key], " - ", old_annons[key]);
                    }
                  } else {
                    old_annons[key]=annons[key];
                    console.log("Adding "+key, annons[key]);
                  }
                }
              }
              if(old_annons.deleted) {
                old_annons.deleted = false;
                annons.history.push({event: "undeleted", key: "deleted", oldValue: true})
              }

              old_annons.history.concat(annons.history);
            } else {
              // Doesn't exist create as new
              console.log(annons);
              let newAnnons = new Annons(annons);
              newAnnons.save(function (err) {
              if (err) console.error(err);
              else {
                // saved!
                console.log("Saved");
              }
              });
            }
          }
        }.bind(null, annons));

        if(annons.blocket_id) {
          items.push({blocket_id: annons.blocket_id});
        }
        /*var dbAnnons = new Annons(annons);
        items.push(dbAnnons);
        dbAnnons.save(function (err) {
        if (err) return handleError(err);*/
        // saved!
        //console.log("Saved");
        //});
       }
    }

    var nextpage = dom.window.document.querySelector("#all_pages li:nth-last-child(2)").children[0];
    if(nextpage.innerHTML.indexOf("Nästa sida") >= 0)
    {
      var next_href = nextpage.getAttribute("href");
      url = url.substring(0, url.indexOf("?"))+next_href;
      console.log("Next URL: ",url);
      console.log(items.length);
      getList(url, done, items);
    }
    else {
      console.log("Num of items: ",items.length);
      if(done) {
        /*Annons.insertMany(items, function(err, docs) {
          if (err) return handleError(err);
          console.log("Actually Saved");
        });*/
        done(items);
      }
    }
  });
}

function updateList() {
  console.log("Checking each annons and marking sold/deleted annonser");
  Annons.find({ deleted: false }, function(err, items) {
    if (err) console.error(err);
    else {
      //console.log(items);
      //for(let i in items) {
      updateAnnons(items);
    }

  });

  function updateAnnons(annonser, id = 0) {
    //console.log("I: ",id);
    if(annonser.length > id) {
      annons = annonser[id];
      id = id+1;

      if(!annons.blocket_id || !annons.url) {
        annons.deleted = true;
        annons.save(function (err) {
          if (err) console.error(err);
          else {
            // saved!
            console.log("Updates Saved ", id);
            setTimeout(updateAnnons.bind(this, annonser, id), SLEEPTIME);
          }
        });
      }
      else {
        var url = annons.url;
        console.log(url);

        JSDOM.fromURL(url).then(dom => {
          if(dom.window.document.querySelector("#no_ad_title")) {
            // Annonsen is gone
            annons.deleted = true;
          }
          else {
            if(dom.window.document.querySelector("#vi_price")) annons.price = dom.window.document.querySelector("#vi_price").textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"");
            if(dom.window.document.querySelector(".area_label")) annons.place = dom.window.document.querySelector(".area_label").textContent.replace(/\(|\)| /g, "");
            if(dom.window.document.querySelector(".row.mtm.mbxl .body")) annons.description = dom.window.document.querySelector(".row.mtm.mbxl .body").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
            if(dom.window.document.querySelector("#login_to_reply_name")) annons.seller.name = dom.window.document.querySelector("#login_to_reply_name").textContent;

            var images = [];
            if(dom.window.document.querySelector(".carousel-inner")) images = dom.window.document.querySelector(".carousel-inner").children;
            for(let j = 0; j < images.length; j++) {
              var image_url = images[j].children[0].getAttribute("src");
              if(urllib.parse(image_url).protocol) {
                if(annons.images.indexOf(image_url) === -1) {
                  annons.images.push(image_url);
                }
                if(!dryrun) {
                  getImage(image_url, annons);
                }
              }
            }
          }
          annons.save(function (err) {
            if (err) console.error(err);
            else {
              // saved!
              console.log("Updates Saved ", id);
              setTimeout(updateAnnons.bind(this, annonser, id), SLEEPTIME);
            }
          });
          console.log(annons);
        }, function(err) {
          console.error("Some error?", err);
          console.log(annons);
        });
      }
    }
    else {
      console.log("All Done");
      process.exit(1);
    }
  }
}

function getImage(image_url, annons) {
  var split = image_url.split("/");
	var dest =  split[split.length-1];
  const dir = IMAGEDIR+annons.blocket_id+"/";

  console.log("Downloading image ",image_url, dir+dest);
  if (!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	if (!fs.existsSync(dir+dest)){
	  var file = fs.createWriteStream(dir+dest);

		var request = https.get(image_url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				file.close(null);
			});
		});
	}
}
