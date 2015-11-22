require('dotenv').load()

var express=require('express')
var app=express()
var http=require('http').Server(app)
var path=require('path')
var io=require('socket.io')(http)
var Twitter=require('twitter')
var havenondemand=require('havenondemand')
var hodClient= new havenondemand.HODClient('http://api.havenondemand.com',process.env.hpe_apikey)
var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
  api_key: process.env.alchemy_apikey
});

var twitterclient= new Twitter({
	consumer_key:process.env.consumer_key,
	consumer_secret:process.env.consumer_secret,
	access_token_key:process.env.access_token,
	access_token_secret:process.env.access_token_secret
});

newAverage = 0;
oldAverage = 0;
n = 0;

io.on('connection', function(socket){

  socket.on('disconnect', function () {
    socket.emit('user disconnected');
  });

	socket.on('streamTopic',function(msg){
		newAverage = 0;
	    oldAverage = 0;
	    n = 0;
		console.log(msg);
		var data = {text: msg.topic}
		hodClient.call('findrelatedconcepts', data, function(err, resp){	//call related concepts HPE API
			var relatedKeys={text:resp.body.entities}
			var keyExtract="";
		 	var i;
		 	for(i=0;i<relatedKeys.text.length;i++){
		 		keyExtract +=relatedKeys.text[i].text+" ";
		 		 io.emit('relatedKey',relatedKeys.text[i].text)
		 	}

		 	twitterclient.get('search/tweets', {q: msg.topic}, function(error, tweets, response){
			   console.log(tweets);
			});

			twitterclient.stream('statuses/filter', {track:msg.topic}, function(stream){
				stream.on('data',function(tweet){
					     var data = {text: tweet.text}
					      n += 1;
					     console.log('---------------------------------------------');
					     alchemy_language.sentiment(data, function (err, response) {	//call bluemix sentiment analysis API
							  if (err)
							    console.log('error:', err);
							  else{
							    console.log(response);
							    io.emit('tweetDataMix',response)
							  }
						  });
					     hodClient.call('analyzesentiment', data, function(err, resp){
					     var sentiment = resp.body.aggregate.sentiment
					     var score = resp.body.aggregate.score
					     newAverage = calculateRunningAverage(score, n);
			             rgbInstantaneous = mapColor(score);
			             rgbAverage = mapColor(newAverage);
					     console.log(tweet.text + " | " + sentiment + " | " + score)
					     var tweetData = {tweet: tweet, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: newAverage};
					     io.emit('tweetData',tweetData)
					   });
				});

				stream.on('disconnect', function (disconnectMessage) {
			        console.log(disconnectMessage);
			    });

				stream.on('error',function(error){
					throw error;
				});

			});
		});
	});

});

port=process.env.PORT || 8080
app.use(express.static(path.join(__dirname,'public')));

app.get("/", function(req, res){
 res.sendFile(__dirname + '/views/index.html');
})

http.listen(port,function(){
	console.log("listening on port: "+port)
})

mapColor = function (score) {
  weight = Math.floor(((0.5*score + 0.5)*100));
  r = Math.floor( (255 * (100 - weight)) / 100 );
  g = Math.floor( (255 * weight) / 100 );
  b = 0;
  return {r: r, g: g, b:b};
}

calculateRunningAverage = function(score, n) {
  newAverage = oldAverage * (n-1)/n + score/n;   
  oldAverage = newAverage;
  return newAverage;
}