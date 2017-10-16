'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
require("string_format");
var lambda = new AWS.Lambda({"region": "us-east-1"});
var s3 = new AWS.S3({ region: "us-east-1"});
var bucket = "allan-marvel";

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
var getComicsTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/comics?apikey={1}&ts={2}&hash={3}&offset={4}&limit=100"

console.log("Log desde ComicSingle");

module.exports.get = (event, context, callback) => {
  var url = getComicsTemplateUrl.format(event.characterId, apiKey, ts, myhash, event.offset);
  var comicTotal = event.max;
  var comicTitles =[];
  var key = event.characterId+"-comics.json";

  idOnBucket(key, function(foundOnBucket){
    if (foundOnBucket){
      console.log("It exists");
      getComicsBucket(key, callback);
    }
    else {
      console.log("Not found");
      getComics(event, url, comicTitles, key, callback);

    }
  });





};

function idOnBucket(key, callback){
  var params ={
    Bucket: bucket,
    Key: key
  };
  s3.headObject(params, function(err, data) {
    if (err) {
      console.log("No existe el objeto");
      callback(false);
    }
    else {
      console.log("Si existe el objeto");
      callback(true);
    }
  });
}

function getComics(evt, url, comicTitles, key, callback){
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
        saveObject(comicTitles, key, callback);
        //callback(null, comicTitles);
      };
    });
  });
}

function saveObject(comicTitles, key, callback)
{
  var params = {
    Body: JSON.stringify(comicTitles),
    Bucket: bucket,
    Key: key,
    ACL: "public-read",
    ContentType: "application/json"
  };

  s3.putObject(params, function(err, data) {
    if (err){
      callback(err);
    }
    else{
      callback(null, comicTitles);
    }
  });
}

function getComicsBucket(key, callback){
  var params ={
    Bucket: bucket,
    Key: key
  };
  s3.getObject(params, function(err, data){
    if (err){
      callback(err)
    }
    else{
      console.log("Getting from Bucket");
      var response = JSON.parse(data.Body.toString('utf8'));
      callback(null, response);
    }
  });
}
