'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
require("string_format");
var lambda = new AWS.Lambda({"region": "us-east-1"});

var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
var ts = ""; /*[INSERT TIMESTAMP*/
var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/

var getComicsTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/comics?apikey={1}&ts={2}&hash={3}&offset={4}&limit=100"

console.log("Log desde ComicSingle")

module.exports.get = (event, context, callback) => {
  var url = getComicsTemplateUrl.format(event.characterId, apiKey, ts, myhash, event.offset);
  var comicTotal = event.max;
  var comicTitles =[];

  http.get(url, (res) => {
    res.setEncoding('utf8');
    var totalData="";

    res.on("data", (data) => {
      totalData += data;
    });

    res.on("end", (data) => {
      var comics = JSON.parse(totalData);
      //console.log(data);
      comics["data"]["results"].map(
        function(evt){
          comicTitles.push(evt.title);
        }
      );
      if(comicTitles.length == comics["data"]["count"]){
        callback(null, comicTitles);
      };
    });
  });
};
