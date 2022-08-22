//console.log(process.argv);
const url = require('url');

for(var i = 2; i < process.argv.length; i++) {
  console.log(process.argv[i]);
  //console.log(url.parse(process.argv[i]));
  if(url.parse(process.argv[i]).protocol) {
    console.log("Param is url");
  }
}
