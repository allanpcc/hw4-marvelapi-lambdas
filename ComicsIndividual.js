var http = require("http");
var fort = require("string_format");

module.exports.getComics = (event, context, callback) => {

  var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
  var ts = ""; /*[INSERT TIMESTAMP*/
  var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/

  var characterId = event.id;
  var url = "http://gateway.marvel.com/v1/public/characters/{0}/comics?apikey={1}&ts={2}&hash={3}";

  http.get(url.format(characterId, apiKey, ts, myhash), (res) => {
    res.setEncoding('utf8');
    var totalData = "";

    res.on("data", (data) => {
      totalData += data;
    });

    res.on("end", (data) => {
      var comics = JSON.parse(totalData).data.results;
      var comicTitles = {};
        comics.map(
          function(evt){
            comicTitles[evt.id] = evt.title;
          });
    callback(null, comicTitles);
  });
});
}
