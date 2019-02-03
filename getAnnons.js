var util = require("util"),
    http = require("http");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

//const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
//console.log(dom.window.document.querySelector("p").textContent); // "Hello world"

var options = {
    host: "www.blocket.se",
    port: 80,
    path: "/stockholm/Moped_SACHS_BEE_50_EU45_78599668.htm?ca=11&w=1"
};

var content = "";
var annons = {
  seller: {
    name: ""
  },
  publishdDate: "1970-01-01T00:00",
  place: "",
  title: "",
  description: "",
  price: null,
  images: []
}

var req = http.request(options, function(res) {
    res.setEncoding("utf8");
    res.on("data", function (chunk) {
        content += chunk;
    });

    res.on("end", function () {
        //util.log(content);
        const dom = new JSDOM(content);
        if(dom.window.document.querySelector(".subject_large")) {
          annons.title = dom.window.document.querySelector(".subject_large").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
        }
        else if(dom.window.document.querySelector(".subject_medium")) {
          annons.title = dom.window.document.querySelector(".subject_medium").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
        }
        annons.blocket_id = dom.window.document.querySelector("#list_id").value;
        if(dom.window.document.querySelector("#vi_price")) annons.price = dom.window.document.querySelector("#vi_price").textContent.replace(/(\r\n|\n|\r|\t| |kr)/gm,"");
        if(dom.window.document.querySelector(".area_label")) annons.place = dom.window.document.querySelector(".area_label").textContent.replace(/\(|\)| /g, "");
        if(dom.window.document.querySelector(".row.mtm.mbxl .body")) annons.description = dom.window.document.querySelector(".row.mtm.mbxl .body").textContent.replace(/(\r\n|\n|\r|\t)/gm,"");
        if(dom.window.document.querySelector("time")) annons.publishdDate = dom.window.document.querySelector("time").getAttribute("datetime");
        if(dom.window.document.querySelector("#login_to_reply_name")) annons.seller.name = dom.window.document.querySelector("#login_to_reply_name").textContent;
        var images = [];
        if(dom.window.document.querySelector(".carousel-inner")) images = dom.window.document.querySelector(".carousel-inner").children;
        for(var i = 0; i < images.length; i++) {
          annons.images.push(images[i].children[0].getAttribute("src"));
        }
        /*for(var image in images) {
          console.log(images[image].children[0].getAttribute("src"));
        }*/
        //console.log(images.getAttribute("src"));
        //console.log(JSON.stringify(article));
        console.log(annons);
        /*
        , {
          url: "http://blocket.se",
          referrer: "https://www.blocket.se",
          contentType: "text/html",
          includeNodeLocations: true
        }
        */
    });
});

req.end();

//console.log(dom);
