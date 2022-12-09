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
const uri = `mongodb+srv://${userName}:${password}@cluster0.gyq2d5s.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:false}));

process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write("Usage myBookshelfServer.js PORT_NUMBER");
    process.exit(1);
}

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

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
})