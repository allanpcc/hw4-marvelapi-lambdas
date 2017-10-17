'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
var lambda = new AWS.Lambda({"region": "us-east-1"});
require("string_format");
var s3 = new AWS.S3({ region: "us-east-1"});
var bucket = "allan-marvel";

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
var getSeriesTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/series?apikey={1}&ts={2}&hash={3}"
var seriesTotal;

console.log("Log desde SeriesManager");

module.exports.get = (event, context, callback) => {
  var firstCharacterGetSeriesUrl = getSeriesTemplateUrl.format(event.firstCharacterId, apiKey, ts, myhash);
  var secondCharacterGetSeriesUrl = getSeriesTemplateUrl.format(event.secondCharacterId, apiKey, ts, myhash);
  var firstSeries =[];
  var secondSeries = [];
  var key = getKey(event.firstCharacterId, event.secondCharacterId);

  idOnBucket(key, function(foundOnBucket){
    if (foundOnBucket){
      console.log("It exists");
      getSeriesBucket(key, callback);
    }
    else {
      console.log("Not found");
      getSeries(event, firstCharacterGetSeriesUrl, secondCharacterGetSeriesUrl, key, callback);

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
    var series = JSON.parse(totalData);
  if(series["data"]){
    seriesTotal = series["data"]["total"];
  };
  //else{
  callback(null, seriesTotal);
  //console.log(seriesTotal)
  //};
});
});
};

var invokeLambdas = function(characterId,seriesCount, callback){
  var lambdaCount = Math.ceil(seriesCount / 100);
  var tasks = [];
  var series =[];

  for(let index = 0; index < lambdaCount; index++ ){
    var offset = index*100;
    let lambdaParams = {
      FunctionName : 'allan-serv-dev-SeriesSingle',
      InvocationType : 'RequestResponse',
      Payload: '{"characterId": "' + characterId + '", "offset":  "' + offset + '", "max": "' +seriesTotal+'"}'
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
        series = series.concat(dataJSON);
      };
      callback(null, series);
    }
  });
};

function commonSeries(first, second){
  var firstSet = new Set(first);
  var secondSet = new Set(second);
  var common = new Set([...firstSet].filter(x => secondSet.has(x)));
  return Array.from(common);
}

function getKey(firstId, secondId){
  var key ="";
  if (parseInt(firstId) < parseInt(secondId)){
    key = firstId+"-"+secondId+"-series.json";
  }
  else {
    key = secondId+"-"+firstId+"-series.json";
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

function getSeries(event, firstCharacterGetSeriesUrl, secondCharacterGetSeriesUrl, key, callback){
  async.parallel([
      function(callback){
        async.waterfall([
            async.apply(getCharacterDataSimple, firstCharacterGetSeriesUrl),
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
            async.apply(getCharacterDataSimple, secondCharacterGetSeriesUrl),
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
        var res = commonSeries(data[0], data[1]);
        saveObject(res, key, callback);
        //callback(null, res);
      }
    });
}

function saveObject(seriesTitles, key, callback) {
  var params = {
    Body: JSON.stringify(seriesTitles),
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
      callback(null, seriesTitles);
    }
  });
}

function getSeriesBucket(key, callback){
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
