'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
var lambda = new AWS.Lambda({"region": "us-east-1"});
require("string_format");

var apiKey = "" ;/*[INSERT PUBLIC API KEY]*/
var ts = ""; /*[INSERT TIMESTAMP*/
var myhash = ""; /*[HASH TS, PUBLIC KEY, PRIVATE KEY WITH MD5*/

var getSeriesTemplateUrl = "http://gateway.marvel.com/v1/public/characters/{0}/series?apikey={1}&ts={2}&hash={3}"
var seriesTotal;

console.log("Log desde SeriesManager");

module.exports.get = (event, context, callback) => {
  var firstCharacterGetSeriesUrl = getSeriesTemplateUrl.format(event.firstCharacterId, apiKey, ts, myhash);
  var secondCharacterGetSeriesUrl = getSeriesTemplateUrl.format(event.secondCharacterId, apiKey, ts, myhash);
  var firstSeries =[];
  var secondSeries = [];

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
        var res = commonSeries(data[0], data[1])
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
      FunctionName : 'allan-service-dev-SeriesSingle',
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
