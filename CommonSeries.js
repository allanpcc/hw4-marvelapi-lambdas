var http = require("http");
var fort = require("string_format");
var async = require("async");
var AWS = require("aws-sdk");
var lambda = new AWS.Lambda({"region": "us-east-1"});

module.exports.get = (event, context, callback) => {
  var tasks = [];

  for(let index = 0; index < event.characters.length; index++ ){
    tasks.push(function(callback){
      var lambdaParams = {
        FunctionName : 'allan-service-dev-getSeries',
        InvocationType : 'RequestResponse',
        Payload: '{"id": "' + event.characters[index] + '"}'
      };
      lambda.invoke(lambdaParams, function(error, data){
        if(error){
          console.log(error);
          callback(error);
        }
        else{
          callback(null, data);
        }
      })
    });
  }

  async.parallel(tasks, function(error, data){
    if(error){
      console.log(error);
      callback(error);
    }
    else{
      var finalResponse = [];
      for(let index = 0; index < data.length; index++){
        var currentPayload = JSON.parse(data[index].Payload);
        finalResponse.push(currentPayload);
      }
      commonSeries = compare(finalResponse);
      callback(null, commonSeries);
    }
  });

  function compare(allSeries){    /*Array of series for each character selected*/
    var common = [];
    for(var i = 0; i<allSeries.length-1; i++){
      for (var key in allSeries[i]){
        if (key in allSeries[i+1]){
          common.push({
            id: key,
            title: allSeries[i][key]
          });
        }
      }
    }
    return common;
  }
}
