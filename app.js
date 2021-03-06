/*Required variables*/
var async = require("async"); //To make asynchronous requests
var express = require("express"); //The main man
var cheerio = require("cheerio"); //To select HTML elements
var request = require("request"); //To get the url passed in by the user and turn it into html
var bodyParser = require("body-parser"); //To get post information

var app = express();

//Tell express to use bodyParser
app.use(bodyParser.urlencoded({extended: true}));

//Set the view engine to ejs
app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"));



/* ====================================================
                        ROUTES
   ==================================================== */

/* Get route for home page */
app.get("/", function(req,res) {
   res.render("home");
});

/* Post route that scrapes the data of the grades */
app.post("/scrape", function(req, res) {

   var id = req.body.sourceid;
   url = req.body.sourceurl;
   
   //Array of grade objects
   var grades = [];
   
   //Array of async functions
   var asyncTasks = [];
   
   /* This will be the first request */
   request(url, function(error, response, html){
      if(error) {
          console.log(error);
      } else {
          if(!url.endsWith('index.html')){
              res.render("error");
          } else {
              var $ = cheerio.load(html);
          
              var baseUrl = replaceUrl(1, url); //The 1 is just for the paramater
              
              var tables = $('center>table');
              
              var table;
              
              tables.each(function() {
                  if($(this).attr("width", "50%"))
                    table = $(this);
              });
              
              //Filter out the table to reach the anchor tags
              table.filter(function(){
                    var table = $(this);
                    //Get the tr containing the td we need
                    var tr = table.children().last();
                    //Get the td containing all the anchors we need
                    var td = tr.children().last();
                    //Find all the anchors
                    var anchors = td.find("a");
                    //For each anchor get the href
                    anchors.each(function(i, elem){
                       var ahref = $(this).attr("href");
                       var catUrl = baseUrl + ahref;
                       //Create grade object for that specific anchor
                       var grade = {
                           name: $(this).text(),
                           url: catUrl,
                           rank: "",
                           points: "",
                           score: ""
                       };
                       grades.push(grade);
                       asyncTasks.push(function(done){
                          request(grade.url, function(error,response,html){
                              if(error){
                                    res.render("error");
                                    console.log(error);
                                } else {
                                    var $ = cheerio.load(html);
                                    
                                    //Filter out the table containing the scores
                                    $('table').attr('cellpadding', '3').filter(function(){
                                        //Set this as table
                                        var table = $(this);
                                        //Get the first row of that table
                                        var row = table.children().first();
                                        //Loop through all the rows to find the row containing the ID
                                        for(var i = 0; i < table.children().length; i++){
                                            if(row.children().first().text() === id){
                                                var index;
                                                var items = [];
                                                var child = row.children().first();
                                                //Loop through the children of the row
                                                //to find the highlighted ones
                                                for(var j = 0; j < row.children().length; j++) {
                                                    if(child.attr('bgcolor') === '#FFFFD0') {
                                                        index = j;
                                                        items.push(child.text());
                                                    }
                                                    child = child.next();
                                                }
                                                //If 3 items, there is rank, points, and score
                                                if(items.length === 3) {
                                                    grade.rank = items[0];
                                                    grade.points = items[1];
                                                    grade.score = items[2];
                                                    //Get to the 3rd row
                                                    var mainRow = table.children().eq(2);
                                                    var pointsColumn = mainRow.children().eq(index-1);
                                                    grade.points+=" / " + pointsColumn.text();
                                                    var scoreColumn = mainRow.children().eq(index);
                                                    grade.score+="/" + scoreColumn.text();
                                                } else {
                                                    grade.rank = items[0];
                                                    grade.score = items[1];
                                                    var mainRow = table.children().eq(2);
                                                    var scoreColumn = mainRow.children().eq(index);
                                                    grade.score+= " / " + scoreColumn.text();
                                                }
                                                //Exit out of loop
                                                break;
                                                
                                            } else {
                                                row = row.next();
                                            }
                                        } /* end of for loop */
                                        
                                        
                                    }); /* end of filter */
                                    
                                    
                                } /* end of else */
                             done();
                          }, function(err){
                                  if(err){
                                      console.log(err);
                                  }
                        });
                      });
                    }); /* end of for each */
                
              }); /* end of filter */
              
            // Now we have an array of functions doing async tasks
            // Execute all async tasks in the asyncTasks array
            async.parallel(asyncTasks, function(err){
              if(err) {
                  console.log(err);
              } else {
                  // All tasks are done now
                  console.log("Done parsing grades");
                  res.render("scrape",{grades: grades});   
              }
            });
              
              
          } /* end of inner else */
          
      } /* end of gigantic else */
      
   }); /* end of request */
   
}); /* end of /scrape route */

app.get("*", function(req,res) {
   res.send("The page you are looking for doesn't exist"); 
});



/* Function to get the base url */
function replaceUrl(i, url) {
    var str = url.substr(url.lastIndexOf('/') + 1) + '$';
    return url.replace( new RegExp(str), '' );
}


app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Now serving your app!");
});
