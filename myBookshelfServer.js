const express = require('express');
const app = express();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;

const databaseAndCollection = {db: db, collection: collection};

const { MongoClient, ServerApiVersion} = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.vj5zf11.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

// show users booklist
app.get("/booklist", (request, response) => {
    
    getBooklist().then(books => response.render("booklist", books));
});

// add books to booklist
app.post("/addBook", (request, response) => {
    const bookInfo = {
        key: request.body.key,
        title: request.body.title,
        authors: request.body.authors,
        description: request.body.description,
    }

    addBook(bookInfo);
});

// remove a book from booklist and go back to booklist page
app.post("/removeBook", (request, response) => {
  const variables = {
    key: request.body.key,
  };

  removeBook(key).then(() => response.reneder("booklist"));
});


process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write("Usage myBookshelfServer.js PORT_NUMBER");
    process.exit(1);
}
const portNumber = process.argv[2];


app.listen(portNumber);
console.log(`Web server started and running at: http://localhost:${portNumber}`);

const prompt = "Stop to shutdown the server: "
process.stdout.write(prompt);
process.stdin.on("readable", function(){
    let commandInput = process.stdin.read();
    if (commandInput !== null) {
        let command = commandInput.trim();
        if(command === "stop") {
            process.stdout.write("Shutting down the server\n");
            process.exit(0);
        } else {
            process.stdout.write("Invalid command\n");
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

async function getBooklist() {
    try {
        await client.connect();
        const result = await client
            .db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .findOne({"_id": userId});

        await client.close();
        return result.booklist;
    } catch (e) {
        console.log(e);
    }
}

async function addBook(bookInfo) {
    try {
        await client.connect();
        const result = await client
            .db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .updateOne(
                {"_id": userId},
                {
                    $push: {
                        booklist: bookInfo
                }});

        await client.close();

    } catch (e) {
        console.log(e);
    }
}

async function removeBook(key) {
  try {
    await client.connect();
    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(
        { _id: userId },
        {
          $pull: {
            booklist: {key: key},
          },
        }
        );
    await client.close();

  } catch (e) {
    console.log(e);
  }
}
