var http = require("http");
var fort = require("string_format");

module.exports.get = (event, context, callback) => {
  var apiKey = "2e0d738914b3a22464a32992a2a57d69";
  var ts = "18092017";
  var myhash = "43e57955df3ac4f1bfcabdc1c1835f75";
  var characterId = event.id;
  var url = "http://gateway.marvel.com/v1/public/characters/{0}/series?apikey={1}&ts={2}&hash={3}";

  http.get(url.format(characterId, apiKey, ts, myhash), (res) => {
    res.setEncoding('utf8');
  var totalData = "";

  res.on("data", (data) => {
    totalData += data;
});

  res.on("end", (data) => {
    var series = JSON.parse(totalData).data.results;
  var seriesName = {};
  series.map(
    function(evt){
      seriesName[evt.id] = evt.title;
    });
  callback(null, seriesName);
});
});
}
