'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
require("string_format");
var lambda = new AWS.Lambda({"region": "us-east-1"});


var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
var ts = ""; /*[INSERT TIMESTAMP*/
var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/

var getSeriesTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/series?apikey={1}&ts={2}&hash={3}&offset={4}&limit=100"

console.log("Log desde SeriesSingle")

module.exports.get = (event, context, callback) => {
  var url = getSeriesTemplateUrl.format(event.characterId, apiKey, ts, myhash, event.offset);
  var seriesTotal = event.max;
  var seriesTitles =[];

  http.get(url, (res) => {
    res.setEncoding('utf8');
  var totalData="";

  res.on("data", (data) => {
    totalData += data;
});

  res.on("end", (data) => {
    var series = JSON.parse(totalData);
  //console.log(data);
  series["data"]["results"].map(
    function(evt){
      seriesTitles.push(evt.title);
    }
  );
  if(seriesTitles.length == series["data"]["count"]){
    callback(null, seriesTitles);
  };
});
});
};
