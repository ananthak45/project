const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');  // Add this to use path.join
const bcrypt = require('bcrypt'); // Ensure bcrypt is required

const app = express();
const port = 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Praveen@16',
    database: 'restaurant'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database');
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password, type } = req.body;

    if (type === 'admin') {
        const query = `SELECT * FROM admins WHERE username = ? AND password = ?`;
        db.query(query, [username, password], (err, results) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error logging in');
                return;
            }
            if (results.length > 0) {
                res.redirect('/admin.html');
            } else {
                res.status(401).send('<script>alert("Invalid username or password");window.location.href="/login.html";</script>');
            }
        });
    } else if (type === 'user') {
        const loginTime = new Date();
        const insertLoginQuery = `INSERT INTO user_logins (username, login_time) VALUES (?, ?)`;
        db.query(insertLoginQuery, [username, loginTime], (err, results) => {
            if (err) {
                console.error('Error logging user login time:', err);
                res.status(500).send('Error logging in');
                return;
            }
            res.redirect('/user.html');
        });
    } else {
        res.status(400).send('<script>alert("Invalid login type");window.location.href="/login.html";</script>');
    }
});

app.post('/download', (req, res) => {
    const { name, phone, table, items, role } = req.body;
    const billTime = new Date();

    if (role === 'admin') {
        const insertBillQuery = `INSERT INTO bill (name, phone, table_no, bill_time) VALUES (?, ?, ?, ?)`;
        db.query(insertBillQuery, [name, phone, table, billTime], (err, result) => {
            if (err) {
                console.error('Error inserting bill:', err);
                res.json({ success: false });
                return;
            }
            const billId = result.insertId;

            const billItems = JSON.parse(items);
            const insertBillItemsQuery = `INSERT INTO bill_items (bill_id, dish_name, category, quantity, price) VALUES ?`;
            const billItemsValues = billItems.map(item => [billId, item.itemName, item.category, item.quantity, item.price]);

            db.query(insertBillItemsQuery, [billItemsValues], (err, result) => {
                if (err) {
                    console.error('Error inserting bill items:', err);
                    res.json({ success: false });
                    return;
                }
                res.json({ success: true, message: 'Bill stored successfully!' });
                alert("Bill stored Successfully.");
            });
        });
    } else {
        res.json({ success: true });
    }
});


// Check table availability endpoint
app.post('/check_table', (req, res) => {
    const { table, date, time } = req.body;
    const [hour, period] = time.split(' ');

    const selectQuery = `
        SELECT * FROM table_booking 
        WHERE table_no = ? AND date = ? AND hour = ? AND period = ?;
    `;
    db.query(selectQuery, [table, date, hour, period], (selectErr, results) => {
        if (selectErr) {
            console.error('Error executing select query:', selectErr);
            return res.json({ success: false, message: 'Error checking table availability' });
        }

        if (results.length > 0) {
            return res.json({ success: false, message: 'Table is already booked' });
        }

        return res.json({ success: true, message: 'Table is available' });
    });
});

// Book table endpoint
app.post('/book_table', (req, res) => {
    const { name, phone, table, date, time } = req.body;
    const [hour, period] = time.split(' ');

    const selectQuery = `
        SELECT * FROM table_booking 
        WHERE table_no = ? AND date = ? AND hour = ? AND period = ?;
    `;
    db.query(selectQuery, [table, date, hour, period], (selectErr, results) => {
        if (selectErr) {
            console.error('Error executing select query:', selectErr);
            return res.json({ success: false, message: 'Error checking table availability' });
        }

        if (results.length > 0) {
            return res.json({ success: false, message: 'Table is already booked' });
        }

        const insertQuery = `
            INSERT INTO table_booking (name, phone, table_no, date, hour, period) 
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        db.query(insertQuery, [name, phone, table, date, hour, period], (insertErr, insertResults) => {
            if (insertErr) {
                console.error('Error executing insert query:', insertErr);
                return res.json({ success: false, message: 'Error booking table' });
            }

            return res.json({ success: true, message: 'Table booked successfully' });
        });
    });
});


// Route to fetch all chefs
app.get('/chef', (req, res) => {
    db.query("SELECT * FROM chefs", (err, chefs) => {
        if (err) {
            console.error('Error fetching chefs:', err);
            res.status(500).send('Error fetching chefs');
            return;
        }
        // Send HTML response directly
        let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chef Management</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f8f9fa;
                        padding: 20px;
                        background-image:url('data:image/jpeg;base64,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');
                        background-repeat:no-repeat;
                        background-size:100%;
                    }
                    h1 {
                        margin-bottom: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                        background-color: rgba(255, 255, 255, 0.719);
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    .action-buttons {
                        display: flex;
                        justify-content: space-between;
                    }
                         .back-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: #ff0000;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .back-button:hover {
            background-color: #ff0000;
        }
                </style>
            </head>
            <body>
                <h1 style="text-align:center; color:white">Chef Management</h1>
                 <button class="back-button" onclick="window.history.back()">Back</button>
                <div class="action-buttons">
                    <a href="/addchefs" style="text-decoration: none; color: white; background-color: #007bff; padding: 10px 20px; border-radius: 5px;">Add New Chef</a>
                </div>
                <table>
                    <thead>
                        <tr>
                        <th>Id</th>
                            <th>Name</th>
                            <th>Age</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Cuisine</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chefs.map(chef => `
                            <tr><td>${chef.id}</td>
                                <td>${chef.name}</td>
                                <td>${chef.age}</td>
                                <td>${chef.phone}</td>
                                <td>${chef.email}</td>
                                <td>${chef.cuisine}</td>
                                <td>
                                    <a href="/delete/${chef.id}" style="text-decoration: none; color: white; background-color: #dc3545; padding: 5px 10px; border-radius: 3px;">Delete</a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        res.send(html);
    });
});
app.get('/addchefs',(req,res)=>{
    res.sendFile(path.join(__dirname,'public','chefs.html'));
});
// Route to delete a chef
app.get('/delete/:id', (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM chefs WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error('Error deleting chef:', err);
            res.status(500).send('Error deleting chef');
            return;
        }
        console.log('Chef deleted successfully');
        res.redirect('/chef');
    });
});

// Route to handle adding new chef
app.post('/addchef', (req, res) => {
    const { name, age, phone, email, cuisine } = req.body;
    const insertQuery = "INSERT INTO chefs (name, age, phone, email, cuisine) VALUES (?, ?, ?, ?, ?)";
    db.query(insertQuery, [name, age, phone, email, cuisine], (err, result) => {
        if (err) {
            console.error('Error inserting chef:', err);
            res.status(500).send('Error inserting chef');
            return;
        }
        console.log('Chef inserted successfully');
        res.redirect('/chef');
    });
});

app.get('/menu', (req, res) => {
    db.query('SELECT * FROM menu', (err, results) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.send(renderMenuHTML(results));
    });
});

app.get('/usermenu', (req, res) => {
    db.query('SELECT * FROM menu', (err, menuItems) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        let data = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restaurant Menu Management</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f8f9fa;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background-repeat: no-repeat;
                background-size: 100%;
                background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAbD1yb29-3-BmJPoI1XK8NjYFyiZm0koZHg&s');
            }
            .container {
                width: 80%;
                max-width: 1200px;
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                margin-bottom: 20px;
                text-align: center;
                color: white;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            .action-buttons {
                display: flex;
                justify-content: space-between;
            }
            .add-button {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 10px;
                color: #fff;
                background-color: #007bff;
                text-decoration: none;
                border-radius: 5px;
            }
            .delete-button {
                display: inline-block;
                padding: 5px 10px;
                color: #fff;
                background-color: #dc3545;
                text-decoration: none;
                border-radius: 3px;
            }
            .back-button {
                position: absolute;
                top: 20px;
                right: 20px;
                background-color: #ff0000;
                color: white;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            .back-button:hover {
                background-color: #ff0000;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Restaurant Menu Management</h1>
            <button class="back-button" onclick="window.history.back()">Back</button>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${menuItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.description}</td>
                            <td>${item.price}</td>
                           
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>`;
        res.send(data);
    });
});


app.post('/addmenuitem', (req, res) => {
    const { name, description, price } = req.body;
    db.query('INSERT INTO menu (name,description, price) VALUES (?,?,?)', [name,description, price], (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
       
        res.redirect('/menu');
    });
});

app.get('/addmenuitem', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'addmenuitem.html'));
});

function renderMenuHTML(menuItems) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Restaurant Menu Management</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f8f9fa;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                 background-repeat: no-repeat;
            background-size: 100%;
            background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAbD1yb29-3-BmJPoI1XK8NjYFyiZm0koZHg&s');
  
     
            }
            .container {
                width: 80%;
                max-width: 1200px;
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                margin-bottom: 20px;
                text-align: center;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            .action-buttons {
                display: flex;
                justify-content: space-between;
            }
            .add-button {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 10px;
                color: #fff;
                background-color: #007bff;
                text-decoration: none;
                border-radius: 5px;
            }
            .delete-button {
                display: inline-block;
                padding: 5px 10px;
                color: #fff;
                background-color: #dc3545;
                text-decoration: none;
                border-radius: 3px;
            }
                         .back-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: #ff0000;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .back-button:hover {
            background-color: #ff0000;
        }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="text-align:center; color:white">Restaurant Menu Management</h1>
                 <button class="back-button" onclick="window.history.back()">Back</button>
            <div class="action-buttons">
                <a href="/addmenuitem" class="add-button">Add New Menu Item</a>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${menuItems.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.description}</td>
                            <td>${item.price}</td>
                            <td>
                                <a href="/delete1/${item.id}" class="delete-button">Delete</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;
}

// Serve booking.html
app.get('/booking', (req, res) => {
    res.sendFile(__dirname + '/public/booking.html');
});
app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});
// Serve admin page
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve user page
app.get('/user.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Serve bill page
app.get('/bill', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bill.html'));
});
app.get('/booking', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

app.get('/worker', (req, res) => {
    db.query('SELECT * FROM workers', (err, results) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.send(renderHTML(results));
    });
});

app.post('/addworker', (req, res) => {
    const { name, age, phone, email, worktype } = req.body;
    db.query('INSERT INTO workers (name, age, phone, email, worktype) VALUES (?, ?, ?, ?, ?)', [name, age, phone, email, worktype], (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.redirect('/worker');
    });
});

app.get('/delete2/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM workers WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.redirect('/worker');
    });
});

app.get('/delete1/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM menu WHERE id = ?', [id], (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.redirect('/menu');
    });
});
app.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const { name, age, phone, email, worktype } = req.body;
    db.query('UPDATE workers SET name = ?, age = ?, phone = ?, email = ?, worktype = ? WHERE id = ?', [name, age, phone, email, worktype, id], (err) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.redirect('/');
    });
});

app.get('/addworker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'addworker.html'));
});

function renderHTML(workers) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Worker Management</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f8f9fa;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh; 
            background-repeat: no-repeat;
            background-size: 100%;
            background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5VVN8lMe4XE7UlW19R9BpdBQKFyHd0ExP6X9S6eD3hy-YVRazzYbfLJb8dPNbkb_S-LI&usqp=CAU');
      
            }
            .container {
                width: 80%;
                max-width: 1200px;
                background-color: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                margin-bottom: 20px;
                text-align: center;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            .action-buttons {
                display: flex;
                justify-content: space-between;
            }
            .add-button {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 10px;
                color: #fff;
                background-color: #007bff;
                text-decoration: none;
                border-radius: 5px;
            }
            .delete-button {
                display: inline-block;
                padding: 5px 10px;
                color: #fff;
                background-color: #dc3545;
                text-decoration: none;
                border-radius: 3px;
            }
                         .back-button {
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: #ff0000;
            color: white;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .back-button:hover {
            background-color: #ff0000;
        }
        </style>
    </head>
    <body>
        <div class="container">
            <h1 style="text-align:center; color:white">Worker Management</h1>
                 <button class="back-button" onclick="window.history.back()">Back</button>
            <div class="action-buttons">
                <a href="/addworker" class="add-button">Add New Worker</a>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Work Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${workers.map(worker => `
                        <tr>
                            <td>${worker.name}</td>
                            <td>${worker.age}</td>
                            <td>${worker.phone}</td>
                            <td>${worker.email}</td>
                            <td>${worker.worktype}</td>
                            <td>
                                <a href="/delete2/${worker.id}" class="delete-button">Delete</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;
}



app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
