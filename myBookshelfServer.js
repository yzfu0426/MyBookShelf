const express = require('express');
const app = express();
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;

const databaseAndCollection = {db: db, collection: collection};

const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.gyq2d5s.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const bodyParser = require("body-parser");
const { request } = require('http');
const { response } = require('express');

const userId = ObjectId("6394c0c1126bdfee4ce0bc7a");

app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

// show users booklist
app.get("/booklist", (request, response) => {
    
    // getBooklist().then(books => response.end(JSON.stringify(books)));
    getBooklist().then(books => response.render("booklist", {books: books}));
});

// add books to booklist
app.post("/addBook", (request, response) => {
    const bookInfo = {
        key: request.body.key,
        title: request.body.title,
        authors: request.body.authors,
        description: request.body.description,
        cover_id: request.body.cover_id,
    };

    addBook(bookInfo).then(() => response.end(JSON.stringify(bookInfo)));
});

// remove a book from booklist and go back to booklist page
app.post("/removeBook", (request, response) => {
    const key = request.body.key;

    console.log(key);

    removeBook(key)
        // .then(() => getBooklist())
        .then(() => response.redirect("/booklist"));
});


process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write("Usage myBookshelfServer.js PORT_NUMBER");
    process.exit(1);
}
const portNumber = process.argv[2];
let buttonName1, buttonName2;

app.get('/', (request, response) => {
    buttonName1 = "Login";
    buttonName2 = "Sign up";
    response.render('index', {buttonName1, buttonName2});
})

// TODO: add password double confirmation, check whether user already existed in the database
app.get('/signUp', (request, response) => {
    let title = "Sign Up";
    let process = "processSignUp";
    response.render('credentials', {portNumber, process, title});
})

app.post('/processSignUp', async (request, response) => {
    let {username, password} = request.body;
    try {
        await client.connect();
        console.log("**** Inserting one user ****");
        let user = {username: username, 
                    password: password,
                    booklist: []};
        await insertUser(user);
        buttonName1 = "Booklist";
        buttonName2 = username;
        response.render('index', {buttonName1, buttonName2});
    } catch (e) {
        console.log(e);
    } finally {
        await client.close();
    }
})

app.get('/logIn', (request, response) => {
    let title = "Log In";
    let process = "processLogIn";
    response.render('credentials', {portNumber, process, title});
})

app.post('/processLogIn', async (request, response) => {
    let {username, password} = request.body;
    try {
        await client.connect();
        console.log("**** Log In one user ****");
        let user = await logUserIn(username, password);
        // TODO: add logic to check whether user exists
        if (user['password'] !== password) {
            console.log("Incorrect password, try again");
            let title = "Log In";
            let process = "processLogIn";
            response.render('credentials', {portNumber, process, title});
        } else {
            buttonName1 = "Booklist";
            buttonName2 = username;
            response.render('index', {buttonName1, buttonName2});
        }
    } catch (e) {
        console.log(e);
    } finally {
        await client.close();
    }
})


//https://openlibrary.org/search.json?title=atomic+habits
app.get('/search', (request, response) => {
    const {title} = request.query;
})



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
        let filter = { _id: userId };
        await client.connect();
        const result = await client
                            .db(databaseAndCollection.db)
                            .collection(databaseAndCollection.collection)
                            .findOne(filter);

        await client.close();
        return result.booklist;
    } catch (e) {
        console.log(e);
    }
}

async function addBook(bookInfo) {
  try {
    let filter = { _id: userId};
    console.log(bookInfo);
    await client.connect();
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .updateOne(
                            filter,
                            {$push: {booklist: bookInfo}}
                        );

    await client.close();

  } catch (e) {
    console.log(e);
  }
}

async function removeBook(key) {
  try {
    let filter = { _id: userId };

    await client.connect();
    const result = await client
                        .db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .updateOne(
                            filter,
                            {$pull: {booklist: {key: key}}}
                        );

    await client.close();
    console.log(result);
  } catch (e) {
    console.log(e);
  }
};




async function insertUser(user) {
    const result = await client
                        .db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(user);
    console.log(`Applicant entry created with id ${result.insertedId}`);
}


async function logUserIn(username, password) {
    let filter = {username:username};
    const result = await client.db(databaseAndCollection.db)
                         .collection(databaseAndCollection.collection)
                         .findOne(filter);

    return result;

} 
