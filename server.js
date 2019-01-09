'use strict';

// Require express and create an instance of it
const express = require('express');
const app = express();
const path = require('path');
const PORT = 8080;
// Require the imager module
const imager = require('./imager');
//stat arrays
let stats = {
 recent_path : [],
 recent_size : [],
 recent_text : [],
 top_size : [],
 top_referrers : [],
 hit_count : []
}
// api route
app.use(express.static(path.join(__dirname, './public')));

app.get('/stats', function (req, res) {
	res.sendFile(__dirname + '/public/stats.html')
})
//getting the image requested with specific parameters
app.get('/img/:width/:height', function(req,res){
    let width = req.params.width;
    let height = req.params.height;
    let square = req.query.square;
    let text = req.query.text

    //Maximum dimentions,if the width or height is more than 2000px then sends error 403
    if(width > 2000 || height > 2000){
      return res.status(403).send('Invalid Size');
    }
    //invalid dimentions, sends error 400 if not valid
   	if(width <= 0 || height <= 0 || width % 1 !==0 || height % 1 !==0 || height == NaN || width == NaN){
      return res.status(400).send('Invalid Size or Not a number');
    }
		width = parseInt(width);
		height = parseInt(height);
		//validate the square, sends error 400 if not valid
		if (square <= 0){
			return res.status(400).send('Square not valid');
		}
	 	if (square % 1 == 0){
			square = parseInt(square);
		}
		else if (square !== undefined){
			return res.status(400).send('Square not valid');
		}
		//display imsg with the give parameters
		imager.sendImage(res, width, height, square, text);

		let squareparam = '?square='+ req.query.square;
		let textparam = 'text=' + encodeURIComponent(req.query.text);

		if(!isNaN(square) && (text !== null || typeof text != 'undefined')){
			textparam = '&' + textparam;
		  }

		if(isNaN(req.query.square) && (req.query.text !== null|| typeof req.query.text != 'undefined')){
			textparam = '?' + textparam;
			}

		if(text === null || typeof text == 'undefined'){
			textparam = '';
		  }

		if(isNaN(square)){
			squareparam = '';
			}

		let recent = req.path + squareparam + textparam;
		if(stats.recent_path.indexOf(recent) > - 1){
			 stats.recent_path.splice(stats.recent_path.indexOf(recent), 1);
		 }
		 //checks if the recent path is larger or equal to 10
 		if(stats.recent_path.length >= 10){
			//removes the oldest path
 			stats.recent_path.pop();
 		}

		stats.recent_path.unshift(recent);
		//stores the size as a json object
		let size = { 'w': width,
								 'h': height };
    for(let i = stats.recent_size.length; i >- 1; i--) {
      if (JSON.stringify(stats.recent_size[i]) === JSON.stringify(size)) {
        stats.recent_size.splice(i, 1);
      }
    }
		//checks if the array is larger or equal to 10
    if(stats.recent_size.length >= 10){
			//remove the oldest size
      stats.recent_size.pop();
    }
			//adds the recent size to the front of the array
      stats.recent_size.unshift(size)


		if(stats.recent_text.length >= 10){
      stats.recent_text.pop();
    }
    if(stats.recent_text.indexOf(text) != -1){
      stats.recent_text.splice(stats.recent_text.indexOf(text), 1);
    }
    if(text !== null && typeof text != 'undefined'){
      stats.recent_text.unshift(text);
    }

    const index = findIndex(stats.top_size, size);
    if (index !== -1) {
        const item = stats.top_size[index];
        item.n += 1;
    } else {
        stats.top_size.unshift({w: size.w,
																h: size.h,
																n: 1});
    }
    if (stats.top_size.length === 0)
		 return;
    if (stats.top_size[0].n === undefined)
		 return;
    stats.top_size.sort((a, b) => b.n - a.n);
		//checks if array is larger than 10
		if(stats.top_size.length > 10){
		 	stats.top_size.pop()}

			let referer = req.get('Referrer')
				if (referer !== undefined) {
					if (stats.top_referrers.length == 0) {
						let ref_counter = {
							ref: referer,
							n: 1
						}
						stats.top_referrers.push(ref_counter)
					} else {
						let inlist = false;
						stats.top_referrers.forEach(function (value, i) {
							if (value.ref == referer) {
								value.n += 1;
								inlist = true;
							}
						});
						if (!inlist) {
							let ref_counter = {
								ref: referer,
								n: 1
							}
							stats.top_referrers.push(ref_counter)
						}
					}
				}
				
stats.hit_count.push(Date.now())
});

//returns array of the most recent paths requested and returns a status "200"
app.get('/stats/paths/recent',function(req,res){
  res.status(200).send(stats.recent_path)
});

//returns array of the ten most recent image sizes served and returns a status "200"
app.get('/stats/sizes/recent',function(req,res){
  res.status(200).send(stats.recent_size)
});

//returns array of the ten most recent texts requested and returns a status "200"
app.get('/stats/texts/recent',function(req,res){
  res.status(200).send(stats.recent_text)
});
//returs array of the top ten image sizes and returns a status "200"
app.get('/stats/sizes/top',function(req, res){
  res.status(200).send(stats.top_size)
});
//returns array of the top ten referreers and returns a status "200"
app.get('/stats/referrers/top', function (req, res){
	res.status(200).send(stats.top_referrers.reverse().slice(0, 10))
});

//empties all the arrays in the stats object/ resetting counters and returns a status "200"
app.delete("/stats", function(req, res) {
  resetStats();
  res.sendStatus("200");
});

	const resetStats = function() {
	  stats = {
		 recent_path : [],
	 	 recent_size : [],
	 	 recent_text : [],
	 	 top_size : [],
	 	 top_referrers : [],
		 hit_count : []
	  }
	}


	// Getting an array of 3 hit counts
app.get("/stats/hits", function (req, res){

	const ctime = Date.now()
	let time = [
	  { "title" : '5s', "count": 0 },
	  { "title": '10s', "count": 0 },
	  { "title": '15s', "count": 0 }
	];

	stats.hit_count.forEach(function (hit, i) {
		if (hit > ctime - 5000) {
			time[0].count += 1
		}
		if (hit > ctime - 10000) {
			time[1].count += 1
		}
		if (hit > ctime - 15000) {
			time[2].count += 1
		}
	});
				res.send(time)
				return
			})

function findIndex(array, object) {
    for (let i = 0; i < array.length; i++) {
        if (array[i].w === object.w && array[i].h === object.h) return i;
    }
    return -1;
}
//start the server
app.listen(PORT, (err) =>{
    if(err) console.log('error starting the server', err);
    else console.log('server started on port ${PORT}');
})
