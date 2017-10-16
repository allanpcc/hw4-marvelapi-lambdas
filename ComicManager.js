'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
var lambda = new AWS.Lambda({"region": "us-east-1"});
require("string_format");

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
var getComicsTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/comics?apikey={1}&ts={2}&hash={3}"
var comicTotal;

console.log("Log desde ComicManager");

module.exports.get = (event, context, callback) => {
  var firstCharacterGetComicsUrl = getComicsTemplateUrl.format(event.firstCharacterId, apiKey, ts, myhash);
  var secondCharacterGetComicsUrl = getComicsTemplateUrl.format(event.secondCharacterId, apiKey, ts, myhash);
  var firstComics =[];
  var secondComics = [];

  async.parallel([
    function(callback){
      async.waterfall([
          async.apply(getCharacterDataSimple, firstCharacterGetComicsUrl),
          async.apply(invokeLambdas, event.firstCharacterId)
        ]
        , function(err, res){
          if(err) {
            console.log(err);
          }
          else{
            callback(null, res);
          }
        }
      )

    },
    function(callback){
      async.waterfall([
          async.apply(getCharacterDataSimple, secondCharacterGetComicsUrl),
          async.apply(invokeLambdas, event.secondCharacterId)
        ]
        , function(err, res){
          if(err) {
            console.log(err);
          }
          else{
            callback(null, res);
          }
        }
      )
    }
    ],
    function(err, data){
      if(err){
        callback(error);
      }
      else{
        var res = commonComics(data[0], data[1])
        callback(null, res);
      }
    });
}

var getCharacterDataSimple = function(getUrl, callback){
  http.get(getUrl, (res) => {
    res.setEncoding('utf8');
    var totalData = "";

    res.on("data", (data) => {
      totalData += data;
    });

    res.on("end", (data) => {
      var comics = JSON.parse(totalData);
      if(comics["data"]){
        comicTotal = comics["data"]["total"];
      };
    //else{
      callback(null, comicTotal);
      //console.log(comicTotal)
    //};
    });
  });
};

var invokeLambdas = function(characterId, comicCount, callback){
  var lambdaCount = Math.ceil(comicCount / 100);
  var tasks = [];
  var comics =[];

  for(let index = 0; index < lambdaCount; index++ ){
    var offset = index*100;
      let lambdaParams = {
        FunctionName : 'allan-serv-dev-ComicSingle',
        InvocationType : 'RequestResponse',
        Payload: '{"characterId": "' + characterId + '", "offset":  "' + offset + '", "max": "' +comicTotal+'"}'
      };
    tasks.push(function(callback){
      lambda.invoke(lambdaParams, function(error, data){
        if(error){
          console.log(error);
          callback(error);
        }
        else{
          callback(null, data);
        }
      });
    });
  };

  async.parallel(tasks, function(error, data){
    //console.log(data)
    if(error){
      console.log(error);
    }
    else {
      for (let index = 0; index < data.length; index++) {
        var dataJSON = JSON.parse(data[index].Payload)
        comics = comics.concat(dataJSON);
      };
      callback(null, comics);
    }
  });
};

function commonComics(first, second){
  var firstSet = new Set(first);
  var secondSet = new Set(second);
  var common = new Set([...firstSet].filter(x => secondSet.has(x)));
  return Array.from(common);
}
