'use strict'

var http = require("http");
var fort = require("string_format");

module.exports.getCharacters = (event, context, callback) => {
  var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
  var ts = ""; /*[INSERT TIMESTAMP*/
  var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/
  var limit = "100";
  var url = "http://gateway.marvel.com/v1/public/characters?apikey={0}&ts={1}&hash={2}&limit={3}";
  /*  console.log(url.format(apiKey, ts, myhash));*/

  http.get(url.format(apiKey, ts, myhash, limit), (res) => {
    res.setEncoding('utf8');
  var totalData = "";

  res.on("data", (data) => {
    totalData += data;
});
  res.on("end", (data) => {
    var characters = JSON.parse(totalData);
  var characterInfo = {};
  if(characters["data"]) {
    characterInfo = characters["data"]["results"].map(
      function (evt) {;
        return {"id": evt.id, "name": evt.name};
      });
  }
  callback(null, characterInfo);
});
});
}
