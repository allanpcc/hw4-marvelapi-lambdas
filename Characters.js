'use strict'

var http = require("http");
var fort = require("string_format");

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
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
