// Dependencies
var express = require("express");
var mongoose = require("mongoose");
// Require axios and cheerio. This makes the scraping possible
var axios = require("axios");
var cheerio = require("cheerio");
// Require Express Handlebars rendering
var exphbs = require("express-handlebars");
var bodyParser = require("body-parser");

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

// bodyParser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Setting mongo URI
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/newsDB";

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Require all models through Mongoose
var db = require("./models");

// Connect to Mongo
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true
});

// Main route will render HTML page
app.get("/", function(req, res) {
  console.log("get home route");
  db.Article.find({})
    .populate("comments")
    .then(data => {
      console.log("rendering home");
      // console.log(data)
      res.render("index", {
        articles: data
      });
    })
    .catch(err => console.log(err));
});

// Fetch all function
app.get("/articles", function(req, res) {
  console.log("get all articles route");
  db.Article.find({}, function(error, data) {
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

// Fetch one function
app.get("/articles/:id", function(req, res) {
  console.log("get single article route");
  db.Article.findOne({
    _id: req.params.id
  })
    .populate("comments")
    .then(function(data) {
      if(data){
        // console.log(data);
        res.render("article", {
          article: data
        });
      } else {
        console.log("no page exists");
        res.render("404", {});
      }
    });
});

app.get("/scrapeTest", async (req, res) => {
  console.log("scrape Test route");
  let links = [];
  await axios
    .get("https://www.ajc.com/news/")
    .then(function(response) {
      // make cheerio's $ represent JQuery's $
      const $ = cheerio.load(response.data);
      $("li.tease a").each((i, anchor) => {
        let linkPath = $(anchor).attr("href");
        let link = "https://www.ajc.com" + linkPath;
        if (
          !links.includes(link) &&
          link.includes("https://www.ajc.com/news/")
        ) {
          links.push(link);
        }
      });
      // console.log(links);
      // test here:
      res.send(response.data);
    })
    .catch(error => console.log(error));
});

// Scraping function
app.get("/scrape", async function(req, res) {
  console.log("scrape route");
  // An empty array of sub-URLs to scrape
  let links = [];

  // get all links from main news page
  await axios
    .get("https://www.ajc.com/news/")
    .then(function(response) {
      // make cheerio's $ represent JQuery's $
      const $ = cheerio.load(response.data);
      $("li.tease a").each((i, anchor) => {
        let linkPath = $(anchor).attr("href");
        let link = "https://www.ajc.com" + linkPath;
        if (
          !links.includes(link) &&
          link.includes("https://www.ajc.com/news/")
        ) {
          links.push(link);
        }
      });
      // console.log(links);
    })
    .catch(error => console.log(error));

  // An empty array to save the data that we'll scrape
  let results = [];

  // scrape for each link
  for (const link of links) {
    await axios
      .get(link)
      .then(response => {
        // make cheerio's $ represent JQuery's $
        const $ = cheerio.load(response.data);

        // scrape for story attributes
        let title = $("div.main-container .tease__text .tease__heading")
          .first()
          .text()
          .trim();

        // scrape for story text, which needs to be built up (they don't have summaries at AJC)
        let story = "";
        $("article p").each((i, paragraph) => {
          let text = $(paragraph)
            .text()
            .trim();
          if (text) {
            story += `${text} \n\n`;
          }
        });

        // scrape for image url
        let img = $("header.tease img")
          .first()
          .attr("src");
        img = "https://www.ajc.com" + img;

        // console.log("link " + link);
        // console.log("img " + img);
        // console.log("title " + title);
        // console.log("story " + story);
        // console.log("///////////////////////////////////////////");

        // check that we got everything
        if (link && title && story && img) {
          results.push({
            link,
            title,
            story,
            img
          });
        }
      })
      .catch(error => console.log(error));
  }

  console.log("all links scraped successfully");
  // console.log("results final: " + results);

  await db.Article.insertMany(results)
    .then(response => {
      res.json(response);
    })
    .catch(error => console.log(error));
});

app.post("/comment/:id", function(req, res) {
  console.log("post comment route hit");
  console.log(req.body);
  db.Comment.create(req.body)
    .then(function(dbComment) {
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { comments: dbComment._id } },
        { new: true }
      );
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
      console.log('successful update')
    })
    .catch(function(err) {
      res.json(err);
    });
});
/* -/-/-/-/-/-/-/-/-/-/-/-/- */

// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port " + PORT);
});
