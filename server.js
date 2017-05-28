let express = require("express");
let Sequelize = require("sequelize");
let bodyParser = require("body-parser");
let request = require("request");

if (process.argv[2] === "dev") {
  require("dotenv").config();
}

let app = express();

let RecentSearch;
// setup a new database
// using database credentials set in .env

let db = process.env.DB_PATH + "/" + process.env.DB_NAME;

let sequelize = new Sequelize(
  "database",
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: "0.0.0.0",
    dialect: "sqlite",
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    storage: db
  }
);

// authenticate with the database
sequelize
  .authenticate()
  .then(function(err) {
    console.log("Connection has been established successfully.");
    // define a new table 'recentsearches'
    RecentSearch = sequelize.define("recentsearches", {
      searchTerm: {
        type: Sequelize.STRING(255)
      }
    });

    // reinitialize the app on every run .. all records are lost
    sequelize.sync({ force: true }).then(() => {
      runApp();
    });
  })
  .catch(function(err) {
    console.log("Unable to connect to the database: ", err);
  });

const runApp = () => {
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/api/latest/imagesearch", function(req, res) {
    RecentSearch.findAll().then(function(searches) {
      let result = searches.map(s => {
        let item = {
          term: s.searchTerm,
          when: s.createdAt
        };

        return item;
      });
      res.json(result);
    });
  });

  let googleApiUri = "https://www.googleapis.com/customsearch/v1";

  app.get("/api/imagesearch/:searchquery", (req, res) => {
    let offset = req.query.offset || 1;
    let searchquery = req.params.searchquery;
    if (searchquery) {
      request(
        {
          uri: googleApiUri,
          qs: {
            cx: process.env.GOOGLE_CX,
            key: process.env.GOOGLE_API_KEY,
            searchType: "image",
            q: searchquery,
            start: offset
          }
        },
        function(error, response, body) {
          if (!error) {
            // store search term into database
            RecentSearch.findOrCreate({
              where: { searchTerm: searchquery }
            });
            body = JSON.parse(body);
            if (response.statusCode === 200) {
              let items = body.items.map(i => {
                let item = {
                  image: i.link,
                  snippet: i.snippet,
                  context: i.image.contextLink,
                  thumbnail: i.image.thumbnailLink
                };
                return item;
              });
              res.json(items);
            } else {
              if (body.hasOwnProperty("error")) {
                res.json({
                  error: { code: body.error.code, message: body.error.message }
                });
              }
            }
          } else {
            res.json(error);
          }
        }
      );
    } else {
      res.status(500).json({ error: "No search specified" });
    }
  });

  app.get("/*", function(req, res) {
    //show instructions
    let html =
      "<html><head><title>Image Search API</title>" +
      "<style>code {color: darkred; background-color: #FEE;}</style>" +
      "</head>" +
      "<body>" +
      "<h1>Image Search API</h1>" +
      "<h2>To search for an image, call:</h2>" +
      "<p><code>" +
      req.headers.host +
      "/api/imagesearch/{image to be searched}?offset={n}</code>, when <code>n</code> is the offset</p>" +
      "<h2>To see list of recent searches, call</h2>" +
      "<p><code>" +
      req.headers.host +
      "/api/latest/imagesearch</code></p>" +
      "<br/><br/><br/><p><strong>Note:</strong>The database is reinitialized when server starts.</p>" +
      "</body></html>";
    res.status(200).send(html);
  });

  let listener = app.listen(process.env.PORT || 5000, function() {
    console.log("App is listening on port " + listener.address().port);
  });
};
