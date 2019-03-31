// Dependencies
var express = require("express");
var mongoose = require("mongoose");
// Require axios and cheerio. This makes the scraping possible
var axios = require("axios");
var cheerio = require("cheerio");
// Require Express Handlebars rendering
var exphbs = require("express-handlebars")

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Database configuration
var databaseUrl = "scraper";

// Require all models through Mongoose
var db = require("./models");

// Connect to Mongo
mongoose.connect(databaseUrl, {
  useNewUrlParser: true
});

// Main route will render HTML page
app.get("/", function (req, res) {
  db.scrapedData.find({}, function (error, data) {
    // Log any errors if the server encounters one
    if (error) {
      console.log(error);
    }
    // Otherwise, send the result of this query to the browser
    else {
      res.render("index", {
        news: data
      })
    }
  });
});

// Fetch all function
app.get("/all", function (req, res) {
  db.scrapedData.find({}, function (error, data) {
    // Log any errors if the server encounters one
    if (error) {
      console.log(error);
    }
    // Otherwise, send the result of this query to the browser
    else {
      res.json(data);
    }
  });
});

// Scraping function
app.get("/scrape", async function (req, res) {

  // An empty array to save the data that we'll scrape
  let results = [];
  // An empty array of sub-URLs to scrape
  let links = [];

  // get all links from main news page
  await axios.get("https://www.ajc.com/news/").then(function (response) {
    // make cheerio's $ represent JQuery's $
    const $ = cheerio.load(response.data);
    $(".tease>div>a").each(anchor => {
      let link = $(anchor).attr("href");
      links.push("https://www.ajc.com" + link);
    })
  }).catch(error => console.log(error))

  // scrape for each link 
  links.forEach(async link => {
    await axios.get(link).then(response => {
      // make cheerio's $ represent JQuery's $
      const $ = cheerio.load(response.data);

      // scrape for story attributes
      let title = $(h2.tease__heading).text().trim();

      // scrape for story text, which needs to be built up (they don't have summaries at AJC)
      let story = "";
      $("story-text p").each(paragraph => {
        let text = $(paragraph).text().trim()
        story += `${text} \n`
      })

      // scrape for image url
      let img = $("div.tease__img--img>img").attr("src")
      img = "https://www.ajc.com"+img

    })
    results.push({
      link,
      title,
      story,
      img
    })
  });
  db.scrapedData.insert(results).catch(err => console.log(err))
})

/* -/-/-/-/-/-/-/-/-/-/-/-/- */

// Listen on port 3000
app.listen(PORT, function () {
  console.log("App running on port " + PORT);
})