'use strict'

var http = require("http");
var fort = require("string_format");

var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
var ts = ""; /*[INSERT TIMESTAMP*/
var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/
var limit = "100";
var urlTemplate = "http://gateway.marvel.com/v1/public/characters?apikey={0}&ts={1}&hash={2}&limit={3}&offset={4}";
module.exports.getCharacters = (event, context, callback) => {
  var url = urlTemplate.format(apiKey, ts, myhash, limit, event.offset);
  var characterTotal = event.max;
  var allCharacter = [];
  /*  console.log(url.format(apiKey, ts, myhash));*/
    http.get(url, (res) => {
      res.setEncoding('utf8');
      var totalData = "";

    res.on("data", (data) => {
      totalData += data;
    });

    res.on("end", (data) => {
      var characters = JSON.parse(totalData);
      var characterInfo = {};
      if (characters["data"]) {
        characterInfo = characters["data"]["results"].map(
          function (evt) {
            allCharacter.push( {"id": evt.id, "name": evt.name});
          });
      }
  if(allCharacter.length == characters["data"]["count"]){
    callback(null, allCharacter);
  };
      });
    });
}
