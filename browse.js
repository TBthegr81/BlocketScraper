const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


console.log("Blocket Scraper 1.0");
var regions = {};
var categories = {};
JSDOM.fromURL("https://www.blocket.se/").then(dom => {
  var regionelements = dom.window.document.querySelector(".regionslist").children;
  for(var i = 0; i < regionelements.length; i++) {
    var region = regionelements[i].children[0];
    regions[i] = {
      name: region.textContent,
      url: region.getAttribute("href")
    };
    console.log("["+i+"] "+region.textContent);
  }
  rl.question('Choose region ', (answer) => {
    console.log('Region:', regions[answer].name);
    console.log("Open ", regions[answer].url);
    JSDOM.fromURL(regions[answer].url).then(dom => {
      var categoryelements = dom.window.document.querySelector("#catgroup").children;
      for(var i = 0; i < categoryelements.length; i++) {
        var category = categoryelements[i];
        if(category.textContent != "" || category.textContent != "--") {
          categories[i] = {
            value: category.getAttribute("value"),
            dataUrl: category.getAttribute("data-url"),
            text: category.textContent
          }

          console.log("["+i+"] "+category.textContent);
        }
      }
      rl.question('Choose category ', (answer) => {
        console.log("Loading category ", categories[answer].text)
        /*JSDOM.fromURL(categories[answer].url).then(dom => {
        });*/
      });
    });

    rl.close();
  });

});
