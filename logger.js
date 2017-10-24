var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB({"region": "us-east-1"});
var cloudwatch = new AWS.CloudWatchLogs({"region": "us-east-1"});
var uuid = require('uuid-js');

var table = "Allan-Marvel-logs";
var logInfo ={};

module.exports.get = (event, context, callback) => {
  console.log (event);
  writeInTable(event);

}

function writeInTable(event){
  getLogInfo(event, function(response){
    response = response
    var dynamoData = {
      "Id": {S: ""+response.Id},
      "Character 1": {N: response['Character 1']},
      "Character 2": {N: response['Character 2']},
      "Common": {S: response.Common},
      "Single Quantity": {N: response['Single Quantity']},
      "Start Time":{S: ""+response['Start Time']},
      "End Time": {S: ""+response['End Time']},
      "Duration": {S: ""+response.Duration},
      "Memory Reserved": {N: response['Memory Reserved']},
      "Memory Used": {N: response['Memory Used']}
    };
    console.log(dynamoData);
    var params = {
      TableName: table,
      Item: dynamoData
    }

    dynamo.putItem(params, function(err, data){
      if (err){
        console.log("No se pudo");
        console.log(err, err.stack);
      }
      else {
        console.log("Se pudo");
        console.log(data);
      }
    });
  });
}

function getLogInfo(event, callback) {
  var params = {
    logGroupName: '/aws/lambda/allan-serv-dev-ComicManager',
    filterPattern: 'REPORT',
    interleaved: true
  };
  if(event.Common == "Series"){
    params.logGroupName = '/aws/lambda/allan-serv-dev-SeriesManager';
  }

  cloudwatch.filterLogEvents(params, function(err, data){
    if (err){
      console.log(err, err.stack);
    }
    else {
      var latest = data.events[data.events.length-1].message;
      console.log ("latest: "+latest);

      var firstIndex = latest.indexOf("Size:")+6;
      var secondIndex = latest.indexOf(' MB', firstIndex);
      var memoryReserved = latest.substring(firstIndex, secondIndex);

      firstIndex = latest.indexOf("Used:")+6;
      secondIndex = latest.indexOf(' MB', firstIndex);
      var memoryUsed = latest.substring(firstIndex, secondIndex);

      firstIndex = latest.indexOf("Duration:")+10;
      secondIndex = latest.indexOf(' ms', firstIndex);
      var duration = latest.substring(firstIndex, secondIndex);

      var endTime = data.events[data.events.length-1].timestamp;
      var startTime = endTime - (Number(duration)*100);

      logInfo={
        "Id": event.Id,
        "Character 1": event['Character 1'],
        "Character 2": event['Character 2'],
        "Common": event.Common,
        "Single Quantity": event['Single Quantity'],
        "Start Time":startTime,
        "End Time": endTime,
        "Duration": duration,
        "Memory Reserved": memoryReserved,
        "Memory Used": memoryUsed
      };
      //console.log(logInfo);
      callback(logInfo);
      //callback('{"Start Time": "' + startTime + '", "End Time": "' +endTime + '", "Duration": "' +duration + '", "Memory Reserved": "' + memoryReserved + '", "Memory Used": "' + memoryUsed + '"}');
    }
  });
}
