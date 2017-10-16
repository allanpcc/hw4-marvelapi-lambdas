'use strict'

var async = require("async");
var AWS = require("aws-sdk");
var http = require("http");
var lambda = new AWS.Lambda({"region": "us-east-1"});
require("string_format");

var apiKey = "2e0d738914b3a22464a32992a2a57d69";
var ts = "18092017";
var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
var getCharacterTemplateUrl = "http://gateway.marvel.com/v1/public/characters?apikey={0}&ts={1}&hash={2}"
var characterTotal;

console.log("Log desde CharacterManager");

module.exports.get = (event, context, callback) => {
  var characterUrl = getCharacterTemplateUrl.format(apiKey, ts, myhash);
  var allCharacters =[];

  async.parallel([
      function(callback){
        async.waterfall([
            async.apply(getCharacterDataSimple, characterUrl),
            async.apply(invokeLambdas, event)
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
    ],
    function(err, data){
      if(err){
        callback(error);
      }
      else{
        callback(null, data);
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
    var characters = JSON.parse(totalData);
  if(characters["data"]){
    characterTotal = characters["data"]["total"];
  };
  //else{
  callback(null, characterTotal);
  //};
});
});
};

var invokeLambdas = function(characterId, characterCount, callback){
  var lambdaCount = Math.ceil(characterCount / 100);

  var tasks = [];
  var characters =[];

  for(let index = 0; index < lambdaCount; index++ ){
    var offset = index*100;
    let lambdaParams = {
      FunctionName : 'allan-serv-dev-getCharacters',
      InvocationType : 'RequestResponse',
      Payload: '{"offset":  "' + offset + '", "max": "' +characterTotal+'"}'
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
        characters = characters.concat(dataJSON);
      };
      callback(null, characters);
    }
  });
};
