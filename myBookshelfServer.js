const path = require("path");
const express = require('express');
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId} = require("mongodb");


require("dotenv").config({ path: path.resolve(__dirname, '.env') });
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const databaseAndCollection = {db: db, collection: collection};

//const uri = `mongodb+srv://${userName}:${password}@cluster0.gyq2d5s.mongodb.net/?retryWrites=true&w=majority`;
const uri = `mongodb+srv://${userName}:${password}@cluster0.vj5zf11.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// const userId = ObjectId("6394c0c1126bdfee4ce0bc7a");

app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use(express.json());
app.use(
    session({
      resave: true,
      saveUninitialized: false,
      secret: "putsomethingsecretheredontshow", // use .env for secret string
    })
  );

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
let assestsPath = path.resolve(__dirname, "assests");
app.use(express.static(assestsPath));



app.get('/', (request, response) => {   
    // console.log(request.session);
    let session = request.session;
    if (request.session.user_id != undefined) {
        response.render('index', {portNumber, session});
    } else {
        response.render('index', {portNumber, session});
    }
    
})

// TODO: add password double confirmation, check whether user already existed in the database
app.get('/signUp', (request, response) => {
    let title = "Sign Up";
    let process = "signUp";
    response.render('credentials', {flag:false, portNumber, process, title});
})

app.post('/signUp', async (request, response) => {
    let {username, password} = request.body;
    try {
        await client.connect();
        console.log("**** Inserting one user ****");
        let user = {username: username, 
                    password: password,
                    booklist: []};
        await insertUser(user);
        request.session.user_id = user._id;
        request.session.username = username;
        request.session.save();
        response.redirect('/');
    } catch (e) {
        console.log(e);
    } finally {
        await client.close();
    }
})

app.get('/login', (request, response) => {
    let title = "Log In";
    let process = "login";
    response.render('credentials', {flag:false, portNumber, process, title});
})

app.post('/login', async (request, response) => {
    let {username, password} = request.body;
    try {
        await client.connect();
        console.log("**** Log In one user ****");
        let user = await findUserByName(username, password);
        // TODO: add logic to check whether user exists
        if (!user){
            console.log(`The user with user name ${username} doesn't exist, try to sign up`);
            response.redirect("/signUp");
        } else if (user['password'] !== password) {
            console.log("Incorrect password, try again");
            let title = "Log In";
            let process = "login";
            let flag = true;
            response.render('credentials', {flag, portNumber, process, title});
            //response.status(401).send("Wrong password, try again");
        } else {
            request.session.user_id = user._id;
            request.session.username = username;
            request.session.save();
            response.redirect('/');
        }
    } catch (e) {
        console.log(e);
    } finally {
        await client.close();
    }
})

app.get("/logout", (request, response) => {
    if (request.session.username != undefined) {
        request.session.destroy();
    }
    response.redirect("/");
});


// https://openlibrary.org/search.json?title=atomic+habits
// https://openlibrary.org/search.json?q=atomic+habits
// http://covers.openlibrary.org/b/isbn/6077476714-L.jpg
app.get('/search', async(request, response) => {
    const {title} = request.query;
    let result = await fetch(`https://openlibrary.org/search.json?q=${title.split(" ").join("+")}`)
                .then(response => response.json())
                .then(b => b.docs);
    //console.log(result);
    let bookList = [];
    await result.forEach(async (book) => {
        if (book?.cover_i) { 
            console.log(book?.cover_i);
            let book_json = {
                title: book?.title,
                authors: book?.author_name,
                key: book?.key,
                //have_read:false,
                // description: await fetch(`https://openlibrary.org/works/${book?.key}.json`,
                //                         {method: 'GET'})
                //                     .then(response => response.json())
                //                     .then(json => json.description)
                //                     .catch(e => console.log(e)),
                cover_id: book?.cover_i
            };
            console.log(book_json);
            bookList.push(book_json);
        }
    });
    console.log(bookList);
    let table = "<table border='1'>";
    table += '<tr><th>Title</th><th>authors</th><th>Cover Image</th><th>Add</th></tr>';
    bookList.forEach((book_json) => {
        let img = `<img src="https://covers.openlibrary.org/b/id/${book_json.cover_id}-L.jpg"/>`;

        table += `<tr><td>${book_json.title}</td>
                    <td>${book_json.authors}</td>
                    <td>${img}</td>
                    <td><form action="http://localhost:${portNumber}/addBook" method="post">
                        <input hidden type="text" name="key" value="${book_json.key}">
                        <input hidden type="text" name="title" value="${book_json.title}">
                        <input hidden type="text" name="authors" value="${book_json.authors}">
                        <input hidden type="text" name="cover_id" value="${book_json.cover_id}">
                        <input id="add_book" type="submit" value="Add to booklist">
                        </form></td></tr>`
        });
    table += '</table>';
    let session = request.session;

    response.render('showBooks', {session, title, table});
})



// show users booklist
app.get("/booklist", (request, response) => {
    
    // getBooklist().then(books => response.end(JSON.stringify(books)));
    let session = request.session;
    getBooklist(request.session).then(books => response.render("booklist", {session, books: books, port: portNumber}));
});

// add books to booklist
app.post("/addBook", (request, response) => {
    if (request.session.user_id === undefined) {
        response.redirect("/login");
    } else {
        const bookInfo = {
            key: request.body.key,
            title: request.body.title,
            authors: request.body.authors,
            cover_id: request.body.cover_id,
        };

        addBook(request.session, bookInfo).then(() => response.redirect("/booklist"));
    }
        // addBook(request.session, bookInfo).then(() => response.end(JSON.stringify(bookInfo)));
});

// remove a book from booklist and go back to booklist page
app.post("/removeBook", (request, response) => {
    const key = request.body.key;

    console.log(key);

    removeBook(request.session, key)
        // .then(() => getBooklist())
        .then(() => response.redirect("/booklist"));
});



process.stdin.setEncoding("utf8");

if (process.argv.length != 2) {
  process.stdout.write("Usage myBookshelfServer.js");
  process.exit(1);
}

// cli
// const portNumber = process.argv[2];
const portNumber = 80;
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





async function insertUser(user) {
    const result = await client
                        .db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(user);
    console.log(`Applicant entry created with id ${result.insertedId}`);
}


async function findUserByName(username, password) {
    let filter = {username:username};
    const result = await client.db(databaseAndCollection.db)
                         .collection(databaseAndCollection.collection)
                         .findOne(filter);

    return result;

} 


async function getBooklist(session) {
    try {
        let filter = { _id: ObjectId(session.user_id) };
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

async function addBook(session, bookInfo) {
  try {
    let filter = { _id: ObjectId(session.user_id) };
    console.log(session.user_id);
    console.log(bookInfo);
    await client.connect();
    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .updateOne(
                            filter,
                            {$push: {booklist: bookInfo}}
                        );

    await client.close();
    console.log(result);
  } catch (e) {
    console.log(e);
  }
}

async function removeBook(session, key) {
  try {
    let filter = { _id: ObjectId(session.user_id) };

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