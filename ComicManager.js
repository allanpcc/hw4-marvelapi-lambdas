'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
var UUID = require('uuid-js');
require("string_format");

var lambda = new AWS.Lambda({"region": "us-east-1"});
var dynamo = new AWS.DynamoDB({"region": "us-east-1"});
var cloudwatch = new AWS.CloudWatchLogs({"region": "us-east-1"});

var s3 = new AWS.S3({ region: "us-east-1"});
var bucket = "allan-marvel";
var table = "Allan-Marvel-logs";

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
var getComicsTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/comics?apikey={1}&ts={2}&hash={3}"
var comicTotal;
var singleTotal=0;

console.log("Log desde ComicManager");

module.exports.get = (event, context, callback) => {
  var firstCharacterGetComicsUrl = getComicsTemplateUrl.format(event.firstCharacterId, apiKey, ts, myhash);
  var secondCharacterGetComicsUrl = getComicsTemplateUrl.format(event.secondCharacterId, apiKey, ts, myhash);
  var firstComics =[];
  var secondComics = [];
  var key = getKey(event.firstCharacterId, event.secondCharacterId);

  idOnBucket(key, function(foundOnBucket){
    if (foundOnBucket){
      console.log("It exists");
      getComicsBucket(key, callback);
      logTableInfo(event, singleTotal)
    }
    else {
      console.log("Not found");
      getComics(event, firstCharacterGetComicsUrl, secondCharacterGetComicsUrl, key, callback);

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
  singleTotal += lambdaCount;
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

function getKey(firstId, secondId){
  var key ="";
  if (parseInt(firstId) < parseInt(secondId)){
    key = firstId+"-"+secondId+"-comics.json";
  }
  else {
    key = secondId+"-"+firstId+"-comics.json";
  }
  //console.log(key);
  return key;
}

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

function getComics(event, firstCharacterGetComicsUrl, secondCharacterGetComicsUrl, key, callback){
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
        var res = commonComics(data[0], data[1]);
        logTableInfo(event, singleTotal);
        saveObject(res, key, callback);
        //callback(null, res);
      }
    });
}

function saveObject(comicTitles, key, callback) {
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

function logTableInfo(event, singleTotal){
  var character1 = event.firstCharacterId;
  var character2 = event.secondCharacterId;
  var SingleQuantity = singleTotal;
  var Id = UUID.create().hex;
  var Common = 'Comics';

  var lambdaParams = {
    FunctionName: 'allan-serv-dev-Logger',
    InvocationType:'Event',
    Payload: '{"Id": "' + Id + '", "Character 1": "' +character1 + '", "Character 2": "' +character2 + '", "Single Quantity": "' + SingleQuantity + '", "Common": "' + Common + '"}'
  };
  console.log("Logging: " + lambdaParams.Payload);
  lambda.invoke(lambdaParams, function(err, data){});
}
